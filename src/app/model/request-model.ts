import {Injectable} from '@angular/core';
import {FinancialInfoDtoReq, FundingReqBudgetsDto, FundingRequestDtoReq, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../service/app-properties.service';
import {FundingRequestErrorCodes} from './funding-request-error-codes';
import {NGXLogger} from 'ngx-logger';
import {ProgramRecommendedCostsModel} from '../program-recommended-costs/program-recommended-costs-model';
import {FundingSourceTypes} from './funding-source-types';
import {FundingRequestTypes} from './funding-request-types';

@Injectable({
  providedIn: 'root'
})
export class RequestModel {
  // Stores the grant selected in Step 1
  private _grant: NciPfrGrantQueryDto;

  // Note that swagger generated two versions of the DTO, one for the request and one for the response.  But they are identical.
  private _requestDto: FundingRequestDtoReq;
  private _programRecommendedCostsModel: ProgramRecommendedCostsModel;

  conversionMechanism: string;

  // Grant viewer URL for use in links
  private _grantViewerUrl: string;

  // Request type
  private _requestType: string;

  // Request comments
  private requestComments: string;
  private _eGrantsUrl: string;

  // approver stuff
  mainApproverCreated = false;
  approverCriteria: any = {};
  // note, element 0 is not used, element 1 represents step1 and so on.
  private stepLinkable = [false, false, false, false, false];

  get recreateMainApproverNeeded(): boolean {
    // need to have logic to determine something changed in request that
    // warrants deletion and recreate of main approvers =
    return this.mainApproverCreated && this.approverCriteriaChanged();
  }

  approverCriteriaChanged(): boolean {
    const newCriteria = this.makeApproverCriteria();
    this.logger.debug('new approver criteria ', newCriteria);
    this.logger.debug('prior approver criteria ', this.approverCriteria);
    return  newCriteria.requestType !== this.approverCriteria.requestType
                || newCriteria.cayCode !== this.approverCriteria.cayCode
                || newCriteria.fundingSources !== this.approverCriteria.fundingSources;
  }

  makeApproverCriteria(): any {
    const approverCriteria: any = {};
    approverCriteria.requestType = this.requestDto.financialInfoDto.requestTypeId;
    approverCriteria.cayCode = this.requestDto.cayCode;
    const fundingSources = Array.from(this._programRecommendedCostsModel.selectedFundingSourceIds);
    fundingSources.sort();
    approverCriteria.fundingSources = fundingSources.join(',');
    // from the create_main_approvers sp, it seems otherDocs has no effect on funding request approvers,
    // only affects funding plan approvers, needs double check with David and Subashini.
    return approverCriteria;
  }

  captureApproverCriteria(): void {
    this.approverCriteria = this.makeApproverCriteria();
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
    // TODO: remove duplication of values across various DTOs
    this._requestDto.applId = value.applId;
    if (!this._requestDto.financialInfoDto) {
      this._requestDto.financialInfoDto = {} as FinancialInfoDtoReq;
    }
    this.requestDto.financialInfoDto.applId = value.applId;


    // This is and should always be the PD from the grant
    this._requestDto.pdNpnId = value.pdNpnId;

    this._requestDto.financialInfoDto.applId = value.applId;
    // this._requestDto.financialInfoDto.fy = value.fy;
    // This npnId is what the user supplies in step2; default is the value from the grant
    this._requestDto.financialInfoDto.requestorNpnId = value.pdNpnId;

    this._grant = value;
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

  constructor(private propertiesService: AppPropertiesService,
              private logger: NGXLogger,
              ) {
    this._grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this._eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this._requestDto = {};
    this._requestDto.financialInfoDto = {};
    this.programRecommendedCostsModel = new ProgramRecommendedCostsModel(logger);
  }

  getValidationErrors(): Array<FundingRequestErrorCodes> {
    const errors = new Array<FundingRequestErrorCodes>();
    if (!this.requestDto.financialInfoDto.requestName || this.requestDto.financialInfoDto.requestName.trim().length === 0) {
      errors.push(FundingRequestErrorCodes.REQUEST_NAME_REQUIRED);
    }
    if (this.requestDto.financialInfoDto.requestName && this.requestDto.financialInfoDto.requestName.length > 100) {
      errors.push(FundingRequestErrorCodes.REQUEST_NAME_TOO_LONG);
    }

    if (!this.requestDto.frtId) {
      errors.push(FundingRequestErrorCodes.REQUEST_TYPE_REQUIRED);
    }

    // this.logger.debug('requestorCayCode:', this.requestDto.financialInfoDto.requestorCayCode);
    if (!this.requestDto.financialInfoDto.requestorCayCode || this.requestDto.financialInfoDto.requestorCayCode.trim().length === 0) {
      errors.push(FundingRequestErrorCodes.REQUEST_CAY_CODE_REQUIRED);
    }

    // TODO: Double check this logic.  We probably only need one of these to be set.
    // NOTE: pdNpnId is the PD on the underlying grant; requestorNpnId is the one chosen in step 2,
    if (!this.requestDto.pdNpnId || !this.requestDto.financialInfoDto.requestorNpnId) {
      errors.push(FundingRequestErrorCodes.REQUEST_PD_REQUIRED);
    }

    return errors;

  }

  canSave(): boolean {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      // this.logger.debug('Validation errors:', errors);
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
    this.stepLinkable = [false, false, false, false, false];
    this.mainApproverCreated = false;
    this.programRecommendedCostsModel.reset();
  }

  disableStepLinks(): void {
    this.stepLinkable = [false, false, false, false, false];
  }

  enableStepLinks(): void {
    this.stepLinkable = [false, false, true, true, true];
  }

  prepareBudgetsAndSetFinalLoa(): void {
    this.requestDto.financialInfoDto.fundingReqBudgetsDtos = new Array<FundingReqBudgetsDto>();
    let isMoonshot = false;

    let temp: FundingReqBudgetsDto;
    this.programRecommendedCostsModel.prcLineItems.forEach((value, key) => {
      this.logger.debug('preparing budgets for source', key);
      if (Number(key.fundingSourceId) === Number(FundingSourceTypes.MOONSHOT_FUNDS)) {
        isMoonshot = true;
      }
      value.forEach(p => {
        temp = p.asBudget();
        this.requestDto.financialInfoDto.fundingReqBudgetsDtos.push(temp);
      });
    });

    // Set final loa to SPL if MoonShot funds selected and the request is type Other Pay or Special Actions
    if (isMoonshot && [Number(FundingRequestTypes.OTHER_PAY_COMPETING_ONLY),
      Number(FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS)].includes(Number(this.requestDto.frtId))) {
      this.logger.debug('Setting final LOA to SPL Committee');
      // TODO: figure out which of these should be set and which can be deleted
      this.requestDto.loaId = 4;
      this.requestDto.financialInfoDto.loaId = 4;
    }


    this.requestDto.financialInfoDto.deleteSources = this.programRecommendedCostsModel.deletedSources;

  }

  /**
   * After saving, the budgets need to be converted back to line items for the PRC component
   *
   */
  restoreLineItems(budgets: Array<FundingReqBudgetsDto>): void {
    this.logger.debug('Restoring line items from budgets', budgets);
    budgets.forEach(b => {
      // this.logger.debug('budget', b);
      const source = this.programRecommendedCostsModel.fundingSourcesMap.get(b.fseId);
      // console.log('source', source);

      const lineItems = this.programRecommendedCostsModel.prcLineItems.get(source);
      if (lineItems) {
        lineItems.forEach(li => {
          if (b.supportYear === li.grantAward.year) {
            li.budgetId = b.id;
          }
        });
      } else {
        this.logger.warn('no line items for source', source.fundingSourceName);
      }
    });
  }
}
