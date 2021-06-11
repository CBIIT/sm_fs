import {AfterViewChecked, AfterViewInit, Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {isArray} from 'rxjs/internal-compatibility';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestValidationService} from '../model/funding-request-validation-service';
import {FundingRequestErrorCodes} from '../model/funding-request-error-codes';
import {FundingRequestTypes} from '../model/funding-request-types';

@Component({
  selector: 'app-request-information',
  templateUrl: './request-information.component.html',
  styleUrls: ['./request-information.component.css']
})
export class RequestInformationComponent implements OnInit {

  get selectedRequestType(): number {
    // this.logger.debug('getSelectedRequestType():', this.requestModel.requestDto.financialInfoDto.requestTypeId);
    return this.requestModel.requestDto.financialInfoDto.requestTypeId;
  }

  set selectedRequestType(value: number) {
    this.logger.debug('request-information-component sees new value', value);
    if (value) {
      this.logger.debug('loading funding sources for type:', value);
      this.fsRequestControllerService.getFundingSourcesUsingGET(
        value,
        this.requestModel.grant.fullGrantNum,
        // TODO: Which fiscal year do we use? From the grant or current default fy?
        // this.requestModel.grant.fy,
        this.requestModel.requestDto.fy,
        // TODO: Selected PD or PD from Grant?
        this.requestModel.requestDto.financialInfoDto.requestorNpnId,
        this.requestModel.requestDto.financialInfoDto.requestorCayCode).subscribe(result => {
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
  _selectedCayCode: string[] = (this.requestModel.requestDto.financialInfoDto.requestorCayCode
    ? [this.requestModel.requestDto.financialInfoDto.requestorCayCode] : []);

  get selectedCayCode(): string[] {
    // this.logger.debug('getSelectedCayCode():', this._selectedCayCode);
    return this._selectedCayCode;
  }

  set selectedCayCode(value: string[]) {
    this.logger.debug('setSelectedCayCode():', value);
    let testVal = '';
    if (isArray(value) && value[0]) {
      this.logger.debug('requestorCayCode set to first element of array', value[0]);
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = value[0];
      this.requestModel.requestDto.requestorCayCode = value[0];
      testVal = value[0];
    } else if (typeof value === 'string' || value instanceof String) {
      this.logger.debug('Requestor cayCode set to string value', value);
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = String(value);
      this.requestModel.requestDto.requestorCayCode = String(value);
      testVal = String(value);
    } else {
      this.logger.debug('Requestor cayCode set to undefined');
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = undefined;
      this.requestModel.requestDto.requestorCayCode = undefined;
    }
    // TODO: FS-163 - display an error message if user selects 'MB' for type 9 or 1001 request types
    if ([FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD,
      FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS].includes(Number(this.requestModel.requestDto.frtId))) {
      if (testVal === 'MB') {
        this.fundingRequestValidationService.raiseError.next(FundingRequestErrorCodes.MUST_SELECT_DIVERSITY_SUPPLEMENT_FOR_MB);
        this.logger.error('You must select Diversity Supplement (includes CURE Supplements) as the request type');
      }
    }
    this._selectedCayCode = value;
  }

  // TODO: Clarify the pdNpnId vs requestorNpnId
  get selectedPd(): number {
    return this.requestModel.requestDto.financialInfoDto.requestorNpnId;
  }

  set selectedPd(value: number) {
    // TODO - do we need requestorNpnId on requestDto?
    const valueChanged = this.requestModel.requestDto.requestorNpnId && (this.requestModel.requestDto.requestorNpnId !== value);
    this.requestModel.requestDto.requestorNpnId = value;
    this.requestModel.requestDto.financialInfoDto.requestorNpnId = value;
    if (valueChanged) {
      this.logger.debug('Resetting requestorCayCode');
      this.requestModel.requestDto.financialInfoDto.requestorCayCode = undefined;
    }
  }

  constructor(private requestModel: RequestModel, private logger: NGXLogger,
              private fundingRequestValidationService: FundingRequestValidationService,
              private fsRequestControllerService: FsRequestControllerService) {
  }

  ngOnInit(): void {
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
