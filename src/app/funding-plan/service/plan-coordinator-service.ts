import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { PlanModel } from '../../model/plan/plan-model';
import { FsRequestControllerService, FundingReqBudgetsDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';

@Injectable({
  providedIn: 'root'
})
export class PlanCoordinatorService {
  fundingSourceValuesEmitter = new Subject<{ pd: number, ca: string }>();
  grantInfoCostEmitter = new Subject<{ index: number, dc: number, tc: number }>();
  fundingSourceSelectionEmitter = new Subject<{ index: number, source: FundingRequestFundsSrcDto }>();
  private _selectedSources: Map<number, number> = new Map<number, number>();

  private budgetMap: Map<number, Map<number, FundingReqBudgetsDto>>;
  private canMap: Map<number, Map<number, FundingRequestCanDto>>;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  inflightPFRs: Map<number, number> = new Map<number, number>();
  private fundedPlanTypes: FundingRequestTypes[] = [
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION,
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP,
    FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE
  ];

  constructor(
    private planModel: PlanModel,
    private fsRequestService: FsRequestControllerService,
    private logger: NGXLogger) {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.buildPlanModel();
  }

  buildPlanModel(): void {
    this.budgetMap = new Map<number, Map<number, FundingReqBudgetsDto>>();
    this.canMap = new Map<number, Map<number, FundingRequestCanDto>>();
    this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.forEach(r => {
      this.logger.debug('=========> ', r.applId);
      const buds = new Map(r.financialInfoDto.fundingReqBudgetsDtos.map(b => [b.fseId, b]));
      const cans = new Map(r.financialInfoDto.fundingRequestCans.map(c => [c.fseId, c]));
      this.budgetMap.set(Number(r.applId), buds);
      this.canMap.set(Number(r.applId), cans);
    });
    this.logger.debug('budgets', this.budgetMap);
    this.logger.debug('cans', this.canMap);
    this.logger.debug('funding sources', this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources);
  }

  trackSelectedSources(index: number, sourceId: number): void {
    // TODO: only track non-null

    if (!!sourceId) {
      this._selectedSources.set(index, sourceId);
    } else {
      this._selectedSources.delete(index);
    }
    // this.logger.debug('trackSelectedSources():', index, sourceId, this._selectedSources.size);
  }

  get selectedSourceCount(): number {
    return this._selectedSources.size;
  }

  getRestrictedSources(index: number): number[] {
    // this.logger.debug('checking restricted sources for #', index);
    const result: number[] = [] as number[];
    this._selectedSources.forEach((value, key) => {
      if (key !== index) {
        result.push(Number(value));
      }
    });
    // this.logger.debug('restricted sources:', result);
    return result;
  }

  checkInFlightPFRs(payload: { applId: number, frtId: number } []): void {
    payload.forEach(r => {
      if (this.fundedPlanTypes.includes(r.frtId)) {
        this.logger.debug('checking in flight PFRs for applid:', r.applId, '====> type:', r.frtId);
        this.fsRequestService.checkInitialPayUsingGET(r.applId, r.frtId).subscribe(result => {
          if (!isNaN(result) && Number(result) > 0) {
            this.inflightPFRs.set(r.applId, result);
            this.logger.debug('in flight PFR found for applId:', r.applId, ':', result);
          }
        });
      }
    });
  }

  getRecommendedFutureYears(applId: number): number {
    const cans = this.canMap.get(Number(applId));
    let result = 0;
    if (!!cans) {
      cans.forEach((c, s) => {
        result = c.approvedFutureYrs;
      });
    }
    this.logger.debug('RFY for can', applId, '=', result);
    return result;
  }

  directCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.dcRecAmt || 0;
  }

  totalCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.tcRecAmt || 0;
  }

  getBudget(applId: number, fseId: number): FundingReqBudgetsDto | null {
    const res = this.budgetMap.get(applId)?.get(fseId);
    return !!res ? res : null;
  }
}
