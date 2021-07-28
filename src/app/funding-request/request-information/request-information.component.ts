import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { RequestModel } from '../../model/request/request-model';
import { FsRequestControllerService, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { isArray } from 'rxjs/internal-compatibility';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestValidationService } from '../../model/request/funding-request-validation-service';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { Alert } from '../../alert-billboard/alert';
import { ControlContainer, NgForm } from '@angular/forms';
import { CancerActivitiesDropdownComponent } from '@nci-cbiit/i2ecui-lib';
import { FundingSourceSynchronizerService } from '../../funding-source/funding-source-synchronizer-service';
import { ConversionMechanisms } from '../../type4-conversion-mechanism/conversion-mechanisms';
import { PdCaIntegratorService } from '@nci-cbiit/i2ecui-lib/lib/services/pd-ca-integrator-service';
import { AppUserSessionService } from '../../service/app-user-session.service';

@Component({
  selector: 'app-request-information',
  templateUrl: './request-information.component.html',
  styleUrls: ['./request-information.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class RequestInformationComponent implements OnInit {
  @ViewChild(CancerActivitiesDropdownComponent) cayCode: CancerActivitiesDropdownComponent;
  @Input() parentForm: NgForm;
  isMbOnly = false;
  pdCayCodes: string[] = [];

  myAlerts: Alert[] = [];

  get selectedRequestType(): number {
    return this.requestModel.requestDto.financialInfoDto.requestTypeId;
  }

  set selectedRequestType(value: number) {

    if (value) {
      const conversionMech = ConversionMechanisms.includes(this.requestModel.conversionMechanism)
        ? this.requestModel.conversionMechanism : null;

      this.fsRequestControllerService.getFundingSourcesUsingGET(
        value,
        this.requestModel.grant.fullGrantNum,
        // TODO: Which fiscal year do we use? From the grant or current default fy?
        // this.requestModel.grant.fy,
        this.requestModel.requestDto.fy,
        // TODO: Selected PD or PD from Grant?
        this.requestModel.requestDto.financialInfoDto.requestorNpnId,
        this.requestModel.requestDto.financialInfoDto.requestorCayCode || this.requestModel.grant.cayCode,
        conversionMech).subscribe(result => {
        this.requestModel.programRecommendedCostsModel.fundingSources = result;
      }, error => {
        this.logger.debug('HttpClient get request error for----- ' + error.message);
      });
    }
  }


  // TODO: this is just plain weird. The CA dropdown component selectedValue attribute is an array of strings,
  // so the setter and getter here are typed as arrays of strings. However, the value passed to the setter is
  // just a string, and even though _selectedCayCode is typed as a string[], if I try to assign it a string[]
  // value, it blows up at runtime.  Ditto the getter, which blows up at runtime if I try to return an array
  // of strings, but won't compile if I try to return a string.
  _selectedCayCode: string[] | string = (this.requestModel.requestDto.financialInfoDto.requestorCayCode
    ? [this.requestModel.requestDto.financialInfoDto.requestorCayCode] : []);

  get selectedCayCode(): string[] | string {
    return this._selectedCayCode;
  }

  set selectedCayCode(value: string[] | string) {
    if (isArray(value) && value[0]) {
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = value[0];
      this.requestModel.requestDto.requestorCayCode = value[0];
    } else if (typeof value === 'string' || value instanceof String) {
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = String(value);
      this.requestModel.requestDto.requestorCayCode = String(value);
    } else {
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = undefined;
      this.requestModel.requestDto.requestorCayCode = undefined;
    }
    this.fundingSourceSynchronizerService.fundingSourceNewCayCodeEmitter.next(this.requestModel.requestDto.financialInfoDto.requestorCayCode);
    this._selectedCayCode = value;
  }

  get selectedPd(): number {
    return this.requestModel.requestDto.financialInfoDto.requestorNpnId;
  }

  set selectedPd(value: number) {
    const valueChanged = this.requestModel.requestDto.requestorNpnId && (this.requestModel.requestDto.requestorNpnId !== value);
    this.requestModel.requestDto.requestorNpnId = value;
    this.requestModel.requestDto.financialInfoDto.requestorNpnId = value;
    if (valueChanged) {
      this.requestModel.requestDto.requestorCayCode = undefined;
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = undefined;
      this.cayCode.selectedValue = null;
    }
    this.fundingSourceSynchronizerService.fundingSourceNewPDEmitter.next(this.requestModel.requestDto.requestorNpnId);

  }

  constructor(private requestModel: RequestModel, private logger: NGXLogger,
              private fundingRequestValidationService: FundingRequestValidationService,
              private fsRequestControllerService: FsRequestControllerService,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService,
              private appUserSessionService: AppUserSessionService) {
  }

  ngOnInit(): void {
    this.logger.debug(this.appUserSessionService.isMbOnly);
    this.logger.debug(this.requestModel.isMbOnly());
    this.isMbOnly = this.appUserSessionService.isMbOnly && this.requestModel.isMbOnly();
    if(this.isMbOnly) {
      this.pdCayCodes = ['MB'];
    }
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
}
