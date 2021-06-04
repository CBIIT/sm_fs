import {Injectable} from '@angular/core';
import {FundingRequestDtoReq, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../service/app-properties.service';
import {FundingRequestErrorCodes} from './funding-request-error-codes';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {ProgramRecommendedCostsModel} from '../program-recommended-costs/program-recommended-costs-model';

@Injectable({
  providedIn: 'root'
})
export class RequestModel {


  // fundingSources: Array<FundingRequestFundsSrcDto>;

  // Stores the grant selected in Step 1
  private _grant: NciPfrGrantQueryDto;

  // Note that swagger generated two versions of the DTO, one for the request and one for the response.  But they are identical.
  private _requestDto: FundingRequestDtoReq;

  // Holds the request title
  private _requestName: string;

  // Grant viewer URL for use in links
  private _grantViewerUrl: string;

  // Request type
  private _requestType: string;

  // Request comments
  private requestComments: string;
  private _eGrantsUrl: string;

  // approver stuff
  mainApproverCreated = false;
  private stepLinkable = [false, false, false, false, false];

  get recreateMainApproverNeeded(): boolean {
    // need to have logic to determine something changed in request that
    // warrants deletion and recreate of main approvers
    const somethingChanged = false;
    return this.mainApproverCreated && somethingChanged;
  }

  get requestType(): string {
    return this._requestType;
  }

  set requestType(value: string) {
    this._requestType = value;
  }

  get requestDto(): FundingRequestDtoReq {
    return this._requestDto;
  }

  set requestDto(value: FundingRequestDtoReq) {
    this._requestDto = value;
  }

  get grant(): NciPfrGrantQueryDto {
    return this._grant;
  }


  set grant(value: NciPfrGrantQueryDto) {
    // TODO: map appropriate values from grant to requestDto
    this._requestDto.applId = value.applId;
    if (!this._requestDto.financialInfoDto) {
      this._requestDto.financialInfoDto = {};
    }

    this._requestDto.pdNpnId = value.pdNpnId;

    this._requestDto.financialInfoDto.applId = value.applId;
    this._requestDto.financialInfoDto.fy = value.fy;
    this._requestDto.financialInfoDto.requestorNpnId = value.pdNpnId;
    this._requestDto.financialInfoDto.requestorNpeId = value.pdNpeId;
    this._requestDto.financialInfoDto.requestorCayCode = value.cayCode;

    this._grant = value;
    this.logger.debug('Request model: ', this._grant);
  }

  get requestName(): string {
    return this._requestName;
  }

  set requestName(value: string) {
    this._requestName = value;
  }

  get programRecommendedCostsModel(): ProgramRecommendedCostsModel {
    return this._programRecommendedCostsModel;
  }

  set programRecommendedCostsModel(value: ProgramRecommendedCostsModel) {
    this._programRecommendedCostsModel = value;
  }

  get grantViewerUrl(): string {
    return this._grantViewerUrl;
  }

  get eGrantsUrl(): string {
    return this._eGrantsUrl;
  }

  constructor(private propertiesService: AppPropertiesService, private logger: NGXLogger, private _programRecommendedCostsModel: ProgramRecommendedCostsModel) {
    this._grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this._eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this._requestDto = {};
    this._requestDto.financialInfoDto = {};
  }

  getValidationErrors(): Array<FundingRequestErrorCodes> {
    const errors = new Array<FundingRequestErrorCodes>();
    if (!this.requestDto.requestName || this.requestDto.requestName.trim().length === 0) {
      errors.push(FundingRequestErrorCodes.REQUEST_NAME_REQUIRED);
    }
    if (this.requestDto.requestName && this.requestDto.requestName.length > 100) {
      errors.push(FundingRequestErrorCodes.REQUEST_NAME_TOO_LONG);
    }

    if (!this.requestDto.frtId) {
      errors.push(FundingRequestErrorCodes.REQUEST_TYPE_REQUIRED);
    }

    if (!this.requestDto.requestorCayCode || this.requestDto.requestorCayCode.trim().length === 0) {
      errors.push(FundingRequestErrorCodes.REQUEST_CAY_CODE_REQUIRED);
    }

    // TODO: Double check this logic.  We probably only need one of these to be set.
    if (!this.requestDto.pdNpnId || !this.requestDto.requestorNpnId) {
      errors.push(FundingRequestErrorCodes.REQUEST_PD_REQUIRED);
    }

    return errors;

  }

  canSave(): boolean {
    if (this.getValidationErrors().length > 0) {
      return false;
    }

    return true;
  }

  canSubmit(): boolean {
    // TODO: implement validation rules here
    return true;
  }

  isStepLinkable(step: number): boolean {
    return this.stepLinkable[step];
  }

  setStepLinkable(step: number, linkable: boolean): void {
    this.stepLinkable[step] = linkable;
  }

  reset(): void {
    this._requestDto = {};
    this._requestDto.financialInfoDto = {};
    this._requestType = undefined;
    this._requestName = undefined;
    this.stepLinkable = [false, false, false, false, false];
  }
}
