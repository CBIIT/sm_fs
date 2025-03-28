import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {RequestModel} from '../../model/request/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@cbiit/i2efsws-lib';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestValidationService} from '../../model/request/funding-request-validation-service';
import {FUNDING_POLICY_CUT_TYPES, FundingRequestTypes} from '../../model/request/funding-request-types';
import {Alert} from '../../alert-billboard/alert';
import {ControlContainer, NgForm} from '@angular/forms';
import {CancerActivitiesDropdownComponent} from '@cbiit/i2ecui-lib';
import {FundingSourceSynchronizerService} from '../../funding-source/funding-source-synchronizer-service';
import {ConversionActivityCodes} from '../../type4-conversion-mechanism/conversion-activity-codes';
import {AppUserSessionService} from '../../service/app-user-session.service';
import {Type4SelectionService} from '../../type4-conversion-mechanism/type4-selection.service';

@Component({
  selector: 'app-request-information',
  templateUrl: './request-information.component.html',
  styleUrls: ['./request-information.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class RequestInformationComponent implements OnInit {

  @ViewChild('primaryCayCode') cayCodeComponent: CancerActivitiesDropdownComponent;
  @ViewChild('alternateCayCode') altCayCodeComponent: CancerActivitiesDropdownComponent;
  @Input() parentForm: NgForm;
  isMbOnly = false;
  pdCayCodes: string[] = [];
  private _altCayCode: string | string[] ;

  // TODO: this is just plain weird. The CA dropdown component selectedValue attribute is an array of strings,
  // so the setter and getter here are typed as arrays of strings. However, the value passed to the setter is
  // just a string, and even though _selectedCayCode is typed as a string[], if I try to assign it a string[]
  // value, it blows up at runtime.  Ditto the getter, which blows up at runtime if I try to return an array
  // of strings, but won't compile if I try to return a string.
  _selectedCayCode: string[] | string ;

  myAlerts: Alert[] = [];

  fundingPolicyCutCodes = [
    {id: 'Standard', text: 'Standard'},
    {id: 'Other', text: 'Other'}
  ];

  get selectedRequestType(): number {
    return this.requestModel.requestDto.financialInfoDto.requestTypeId || null;
  }

  set selectedRequestType(value: number) {

    if (value) {
      const conversionActivityCode = ConversionActivityCodes.includes(this.requestModel.requestDto.conversionActivityCode)
        ? this.requestModel.requestDto.conversionActivityCode : null;

      this.refreshFundingSources(value, conversionActivityCode, this.requestModel.requestDto.financialInfoDto.requestorCayCode);
    }
  }

  private refreshFundingSources(requestType: number, conversionActivityCode: string, cayCode: string): void {
    if (!(Number(requestType) === Number(FundingRequestTypes.PAY_TYPE_4))) {
      // NOTE: It's probably harmless to pass the conversion mech even for non-Pay_Type_4, but just in case...
      conversionActivityCode = null;
    }
    if (!requestType || !cayCode) {
      this.logger.warn('Not refreshing funding sources: missing type or cayCode');
      return;
    }
    this.fsRequestControllerService.getFundingSourcesByNpnId(
      this.requestModel.grant.fullGrantNum,
      this.requestModel.requestDto.financialInfoDto.requestorNpnId,
      cayCode,
      requestType,
      this.requestModel.requestDto.requestFy,
      conversionActivityCode).subscribe(result => {
      this.requestModel.programRecommendedCostsModel.fundingSources = result;
    }, error => {
      this.logger.debug('HttpClient get request error for----- ' + error.message);
    });
  }

  get selectedCayCode(): string[] | string {
    return this._selectedCayCode;
  }

  set selectedCayCode(value: string[] | string) {
    // TODO: Evaluate whether to reset the program recommended costs model
    const oldValue = this.requestModel.requestDto.financialInfoDto.requestorCayCode;
    if (Array.isArray(value) && value[0]) {
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = value[0];
      this.requestModel.requestDto.requestorCayCode = value[0];
    } else if (typeof value === 'string' || value instanceof String) {
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = String(value);
      this.requestModel.requestDto.requestorCayCode = String(value);
    } else {
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = undefined;
      this.requestModel.requestDto.requestorCayCode = undefined;
    }
    const changed = oldValue !== this.requestModel.requestDto.financialInfoDto.requestorCayCode;
    if(changed) {
      this.logger.debug(`CA changed from ${oldValue} to ${this.requestModel.requestDto.financialInfoDto.requestorCayCode}`);
      this.fundingSourceSynchronizerService.fundingSourceNewCayCodeEmitter.next(
        this.requestModel.requestDto.financialInfoDto.requestorCayCode);
    }
    this._selectedCayCode = value;
    const conversionActivityCode = ConversionActivityCodes.includes(this.requestModel.requestDto.conversionActivityCode)
      ? this.requestModel.requestDto.conversionActivityCode : null;
    if(changed){
      this.refreshFundingSources(
        this.requestModel.requestDto.financialInfoDto.requestTypeId,
        conversionActivityCode,
        this.requestModel.requestDto.financialInfoDto.requestorCayCode);
    }
  }

  get selectedPd(): number {
    return this.requestModel.requestDto.financialInfoDto.requestorNpnId;
  }

  set selectedPd(value: number) {
    this.logger.debug(`setSelectedPd(${value})`);
    // TODO: Evaluate whether to reset the program recommended costs model
    const oldValue = this.requestModel.requestDto.requestorNpnId;
    const valueChanged = (oldValue !== value);
    this.requestModel.requestDto.requestorNpnId = value;
    this.requestModel.requestDto.financialInfoDto.requestorNpnId = value;
    if (valueChanged) {
      this.logger.info(`PD changed from ${oldValue} to ${value}`);
      this.requestModel.requestDto.requestorCayCode = undefined;
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = undefined;
      this.cayCodeComponent.selectedValue = null;
      this.fundingSourceSynchronizerService.fundingSourceNewPDEmitter.next(this.requestModel.requestDto.requestorNpnId);
    }
  }

  /**
   * Funding sources are still only based on the requesting PD, not the Alt PD. So we only need to sync alt cay code
   * and alt PD with each other
   */
  get altCayCode(): string | string[] {
    return this._altCayCode;
  }

  set altCayCode(value: string | string[]) {
    this.logger.debug(`setAltCayCode(${value})`);
    if (Array.isArray(value) && value[0]) {
      this.requestModel.requestDto.financialInfoDto.altCayCode = value[0];
      this.requestModel.requestDto.altCayCode = value[0];
    } else if (typeof value === 'string' || value instanceof String) {
      this.requestModel.requestDto.financialInfoDto.altCayCode = String(value);
      this.requestModel.requestDto.altCayCode = String(value);
    } else {
      this.requestModel.requestDto.financialInfoDto.altCayCode = undefined;
      this.requestModel.requestDto.altCayCode = undefined;
    }
    this._altCayCode = value;
  }

  get altPdNpnId(): number {
    return this.requestModel.requestDto.financialInfoDto.altPdNpnId;
  }

  set altPdNpnId(value: number) {
    this.logger.debug(`setAltPdNpnId(${value})`);
    const valueChanged = this.requestModel.requestDto.altPdNpnId && (this.requestModel.requestDto.altPdNpnId !== value);
    this.requestModel.requestDto.altPdNpnId = value;
    this.requestModel.requestDto.financialInfoDto.altPdNpnId = value;
    if (valueChanged) {
      this.requestModel.requestDto.altCayCode = undefined;
      this.requestModel.requestDto.financialInfoDto.altCayCode = undefined;
      this.altCayCodeComponent.selectedValue = null;
    }
  }

  constructor(private requestModel: RequestModel, private logger: NGXLogger,
              private fundingRequestValidationService: FundingRequestValidationService,
              private fsRequestControllerService: FsRequestControllerService,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService,
              private appUserSessionService: AppUserSessionService,
              private type4SelectionService: Type4SelectionService) {
    this._altCayCode = (this.requestModel.requestDto.altCayCode
      ? [this.requestModel.requestDto.altCayCode] : []);
    this._selectedCayCode  = (this.requestModel.requestDto.financialInfoDto.requestorCayCode
      ? [this.requestModel.requestDto.financialInfoDto.requestorCayCode] : []);
  }

  ngOnInit(): void {
    this.isMbOnly = this.appUserSessionService.isMbOnly && this.requestModel.isMbOnly();
    if (this.isMbOnly) {
      this.pdCayCodes = ['MB'];
    }
    this.type4SelectionService.Type4SelectionEmitter.subscribe(next => {
      this.onType4Change(next);
    });
  }


  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  payUsingSkip(): boolean {
    return [FundingRequestTypes.PAY_USING_SKIP_FUNDS,
      FundingRequestTypes.PAY_USING_SKIP_FUNDS__NCI_RFA,
      FundingRequestTypes.PAY_USING_SKIP_FUNDS__GENERIC_PAY_USING_SKIP_FUNDS,
      FundingRequestTypes.PAY_USING_SKIP_FUNDS__OUTSIDE_OF_DOC_EXCEPTION_SELECTIONS,
      FundingRequestTypes.PAY_USING_SKIP_FUNDS__WITHIN_DOC_EXCEPTION_SELECTIONS].includes(Number(this.requestModel.requestDto.frtId));
  }

  type4Selected(): boolean {
    return Number(this.selectedRequestType) === Number(FundingRequestTypes.PAY_TYPE_4);
  }

  onType4Change(value: string): void {
    const conversionActivityCode = ConversionActivityCodes.includes(value) ? value : null;
    if ( value === 'R00'
        && Number(this.requestModel.requestDto.financialInfoDto.requestTypeId) === Number(FundingRequestTypes.PAY_TYPE_4)
        && this.requestModel.grant.activityCode === 'K99' ) {
          this.logger.debug('Selected K99 to R00 conversion for Pay Type 4');
          // FS-1685 - no longer clear PD and cayCode
          // this.requestModel.requestDto.financialInfoDto.requestorNpnId = undefined;
          // this.parentForm.controls['pdName'].setValue(null);
    }
    if (this.requestModel.requestDto.financialInfoDto.requestTypeId) {
      this.refreshFundingSources(
        this.requestModel.requestDto.financialInfoDto.requestTypeId,
        conversionActivityCode,
        this.requestModel.requestDto.financialInfoDto.requestorCayCode);
    }
  }

  payType4K99R00Conversion(): boolean {
    return this.requestModel.isPayType4K99R00Conversion();
  }

  get selectedFundingPolicyCut(): string {
    return this.requestModel.requestDto.financialInfoDto.fundingPolicyCut;
  }

  set selectedFundingPolicyCut(value: string) {
    this.requestModel.requestDto.financialInfoDto.fundingPolicyCut = value;
  }

  showFpcSelect(): boolean {
    return FUNDING_POLICY_CUT_TYPES.includes(Number(this.selectedRequestType));
  }

  captureSelection($event: number) {
    this.logger.debug(`capturePdV2SelectionChanged(${$event})`);

  }

  isPayType44R00(): boolean {
    return this.requestModel.is4R00() && this.requestModel.isPayType4();
  }

  is4R00(): boolean {
    return this.requestModel.is4R00();
  }
}
