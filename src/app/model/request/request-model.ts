import { Injectable } from '@angular/core';
import {
  FinancialInfoDtoReq,
  FsCanControllerService,
  FundingReqBudgetsDto,
  FundingRequestCanDto,
  FundingRequestDtoReq,
  NciPfrGrantQueryDto
} from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';
import { FundingRequestErrorCodes } from './funding-request-error-codes';
import { NGXLogger } from 'ngx-logger';
import { ProgramRecommendedCostsModel } from '../../program-recommended-costs/program-recommended-costs-model';
import { FundingSourceTypes } from './funding-source-types';
import { FundingRequestTypes } from './funding-request-types';
import { Alert } from '../../alert-billboard/alert';
import { PrcDataPoint } from '../../program-recommended-costs/prc-data-point';
import { GrantAwardedDto } from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';

@Injectable({
  providedIn: 'root'
})
export class RequestModel {

  pendingAlerts: Alert[] = [];

  // Stores the grant selected in Step 1
  private _grant: NciPfrGrantQueryDto;

  // Note that swagger generated two versions of the DTO, one for the request and one for the response.  But they are identical.
  private _requestDto: FundingRequestDtoReq;
  private _programRecommendedCostsModel: ProgramRecommendedCostsModel;

  conversionMechanism: string;

  // Grant viewer URL for use in links
  private readonly _grantViewerUrl: string;

  // Request type
  private _requestType: string;

  private readonly _eGrantsUrl: string;

  // approver stuff
  mainApproverCreated = false;
  approverCriteria: any = {};
  requestCans: FundingRequestCanDto[];
  // note, element 0 is not used, element 1 represents step1 and so on.
  private stepLinkable = [false, false, false, false, false];
  initialPay: number;
  // "New Request " or "View Request Label"
  title = 'New Request';

  get recreateMainApproverNeeded(): boolean {
    // need to have logic to determine something changed in request that
    // warrants deletion and recreate of main approvers =
    return this.mainApproverCreated && this.approverCriteriaChanged();
  }

  approverCriteriaChanged(): boolean {
    const newCriteria = this.makeApproverCriteria();
    // this.logger.debug('new approver criteria ', newCriteria);
    // this.logger.debug('prior approver criteria ', this.approverCriteria);
    return newCriteria.requestType !== this.approverCriteria.requestType
      || newCriteria.cayCode !== this.approverCriteria.cayCode
      || newCriteria.fundingSources !== this.approverCriteria.fundingSources
      || newCriteria.otherDocs !== this.approverCriteria.otherDocs;
  }

  makeApproverCriteria(): any {
    const approverCriteria: any = {};
    approverCriteria.requestType = this.requestDto.financialInfoDto.requestTypeId;
    approverCriteria.cayCode = this.requestDto.financialInfoDto.requestorCayCode;
    const fundingSources = Array.from(this._programRecommendedCostsModel.selectedFundingSourceIds);
    // fundingSources.sort(); commented for now to make the order of
    // fundingSources important in determining if approvers need to be regen.
    approverCriteria.fundingSources = fundingSources.join(',');
    approverCriteria.otherDocs = this.requestDto.financialInfoDto.otherDocText;
    // from the create_main_approvers sp, it seems otherDocs has no effect on funding request approvers,
    // only affects funding plan approvers, needs double check with David and Subashini.
    return approverCriteria;
  }

  captureApproverCriteria(): void {
    this.approverCriteria = this.makeApproverCriteria();
    this.mainApproverCreated = true;
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
              private canControllerService: FsCanControllerService,
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
    return errors.length <= 0;


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
    // this.logger.warn('About to reset the request model');
    this.title = 'New Request';
    this._requestDto = {};
    this._requestDto.financialInfoDto = {};
    this._requestType = undefined;
    this.stepLinkable = [false, false, false, false, false];
    this.mainApproverCreated = false;
    this.programRecommendedCostsModel.reset();
    this.requestCans = undefined;
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
      // this.logger.debug('preparing budgets for source', key);
      if (Number(key) === Number(FundingSourceTypes.MOONSHOT_FUNDS)) {
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
      // this.logger.debug('Setting final LOA to SPL Committee');
      this.requestDto.loaId = 4;
    }


    this.requestDto.financialInfoDto.deleteSources = this.programRecommendedCostsModel.deletedSources;

  }

  /**
   * After saving, the budgets need to be converted back to line items for the PRC component
   *
   * To restore entirely from the set of budgets:
   * 1. Get the list of funding sources for this request, and set the funding source map
   *    appropriately.
   * 2. Get the list of grant awards as well.
   * 3. Create a line item for each budget
   *    a. set the grant award where the support years match
   *    b. set the funding source from the map based on the fseId
   * 4. Unfortunately, we'll need to infer the line item type (percent or dollar-based),
   *    since we're only keeping the dollar values, but that's minor
   *
   */
  restoreLineItems(): boolean {
    // this.logger.info('restoring budget line items');
    if (!this.requestDto.financialInfoDto.fundingReqBudgetsDtos) {
      // this.logger.warn('Budgets are required');
      return false;
    }
    if (!this.programRecommendedCostsModel.fundingSources || !this.programRecommendedCostsModel.fundingSourcesMap) {
      // this.logger.warn('Funding sources are required');
      return false;
    }
    if (!this.programRecommendedCostsModel.grantAwarded) {
      // this.logger.warn('Grant awards are required');
      return false;
    }

    const awardMap = new Map<number, GrantAwardedDto>();
    this.programRecommendedCostsModel.grantAwarded.forEach(g => {
      awardMap.set(g.year, g);
    });

    this.requestDto.financialInfoDto.fundingReqBudgetsDtos.forEach(b => {
      let lineItem: PrcDataPoint[] = this.programRecommendedCostsModel.prcLineItems.get(b.fseId);
      if (!lineItem) {
        lineItem = [];
        this.programRecommendedCostsModel.prcLineItems.set(b.fseId, lineItem);
      }
      const tmp = new PrcDataPoint();
      tmp.fromBudget(b);
      tmp.grantAward = awardMap.get(b.supportYear);
      tmp.fundingSource = this.programRecommendedCostsModel.fundingSourcesMap.get(b.fseId);
      lineItem.push(tmp);
      this.programRecommendedCostsModel.prcLineItems.set(b.fseId, lineItem);
    });

    this.programRecommendedCostsModel.selectedFundingSources = [];
    this.programRecommendedCostsModel.selectedFundingSourceIds.forEach(i => {
      const source = this.programRecommendedCostsModel.fundingSourcesMap.get(i);
      this.programRecommendedCostsModel.selectedFundingSources.push(source);
    });

    // TODO: Consider sorting each line item by FY?
    // add load/build requestCans because PCM is needed when building cans
    this.loadRequestCans();
    return true;
  }

  restoreLineItemIds(): void {
    if (!this.requestDto.financialInfoDto.fundingReqBudgetsDtos) {
      return;
    }
    // this.logger.debug('Restoring line items from budgets', budgets);
    this.requestDto.financialInfoDto.fundingReqBudgetsDtos.forEach(b => {
      // this.logger.debug('budget', b);
      const source = this.programRecommendedCostsModel.fundingSourcesMap.get(b.fseId);
      // console.log('source', source);

      const lineItems = this.programRecommendedCostsModel.prcLineItems.get(source.fundingSourceId);
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

  loadRequestCans(): void {
    if (this.requestCans && this.requestCans.length > 0) {
      return ;
    }

    this.canControllerService.getRequestCansUsingGET(this.requestDto.frqId).subscribe(
      result => {
        if (result && result.length > 0) {
          this.requestCans = result;
          this.logger.debug('loaded requestCans from db ', result);
        }
        else {
          this.requestCans = [];
          const programCostModel = this.programRecommendedCostsModel;
          this.logger.debug('Program Cost Model ', programCostModel);
          for (const fs of programCostModel.selectedFundingSources) {
            const lineItems = programCostModel.getLineItemsForSourceId(fs.fundingSourceId);
            if (lineItems.length > 0) {
              const lineItem0 = lineItems[0];
              const dto: FundingRequestCanDto = {};
              dto.frqId = this.requestDto.frqId;
              dto.fseId = fs.fundingSourceId;
              dto.fundingSourceName = fs.fundingSourceName;
              dto.requestedTc = lineItem0.recommendedTotal;
              dto.requestedDc = lineItem0.recommendedDirect;
              dto.approvedTc = dto.requestedTc;
              dto.approvedPctCut = lineItem0.percentCutTotalCalculated;
              dto.requestedFutureYrs = lineItems.filter( li => li.recommendedTotal > 0 || li.recommendedDirect > 0).length - 1;
              dto.approvedFutureYrs = dto.requestedFutureYrs;
              this.requestCans.push(dto);
            }
          }
          this.logger.debug('built requestCans from program_cost_model ', this.requestCans);
        }
      },
      error => {
        this.logger.error('getRequestCansUsingGET failed', error);
      }
    );
  }

  clearAlerts(): void {
    this.pendingAlerts = [];
  }

  isSkip(): boolean {
    return [FundingRequestTypes.SKIP, FundingRequestTypes.SKIP__NCI_RFA].includes(Number(this.requestDto.frtId));
  }
}
