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
export class PlanManagementService {
  fundingSourceValuesEmitter = new Subject<{ pd: number, ca: string }>();
  grantInfoCostEmitter = new Subject<{ index: number, applId?: number, dc: number, tc: number }>();
  fundingSourceSelectionEmitter = new Subject<{ index: number, source: FundingRequestFundsSrcDto }>();
  private _selectedSources: Map<number, number> = new Map<number, number>();

  private budgetMap: Map<number, Map<number, FundingReqBudgetsDto>>;
  private canMap: Map<number, Map<number, FundingRequestCanDto>>;
  private percentSelectionTracker: Map<number, boolean> = new Map<number, boolean>();

  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  inflightPFRs: Map<number, number> = new Map<number, number>();

  private fundedPlanTypes: FundingRequestTypes[] = [
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION,
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP,
    FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE
  ];

  private grantValues: Map<number, { index: number, applId?: number, dc: number, tc: number }>;
  private localRfy: Map<number, number>;

  constructor(
    private planModel: PlanModel,
    private fsRequestService: FsRequestControllerService,
    private logger: NGXLogger) {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.grantValues = new Map<number, { index: number, applId?: number, dc: number, tc: number }>();
    this.grantInfoCostEmitter.subscribe(v => {
      this.logger.debug('saving grant values', v);
      if (!!v.applId) {
        this.grantValues.set(v.applId, v);
      }
    });

    this.buildPlanModel();
  }

  setPercentSelected(applId: number, selected: boolean): void {
    this.percentSelectionTracker.set(applId, selected);
  }

  isPercentSelected(applId: number): boolean {
    return this.percentSelectionTracker.get(applId) || false;
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
    this.logger.debug('funding sources', this.planModel.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources);
  }

  pushBudget(applId: number, fseId: number, budget: FundingReqBudgetsDto): void {
    if (!this.budgetMap) {
      this.budgetMap = new Map<number, Map<number, FundingReqBudgetsDto>>();
    }
    const tmp = new Map<number, FundingReqBudgetsDto>();
    tmp.set(fseId, budget);
    this.budgetMap.set(applId, tmp);

  }

  pushCan(applId: number, fseId: number, can: FundingRequestCanDto): void {
    if (!this.canMap) {
      this.canMap = new Map<number, Map<number, FundingRequestCanDto>>();
    }
    const tmp = new Map<number, FundingRequestCanDto>();
    tmp.set(fseId, can);
    this.canMap.set(applId, tmp);
  }


  // NOTE: this is for the purpose of restricting selections for the second and third funding sources
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

  setRecommendedFutureYears(applId: number, rfy: number): void {
    if (!this.localRfy) {
      this.localRfy = new Map<number, number>();
    }
    if (applId && rfy) {
      this.localRfy.set(applId, rfy);
    }
  }

  getRecommendedFutureYears(applId: number): number {
    if (!isNaN(this.localRfy?.get(applId))) {
      return this.localRfy.get(applId);
    }
    const cans = this.canMap.get(Number(applId));
    let result = 0;
    if (!!cans) {
      cans.forEach((c, s) => {
        result = c.approvedFutureYrs;
      });
    }
    this.setRecommendedFutureYears(applId, result);
    this.logger.debug('RFY for can', applId, '=', result);
    return result;
  }

  directCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.dcRecAmt || 0;
  }

  directCostPercentCut(applId: number, fseId: number): number {
    this.logger.debug('dc can ===> ', this.getCan(applId, fseId)?.dcPctCut);

    if (this.getCan(applId, fseId)?.dcPctCut) {
      return this.getCan(applId, fseId).dcPctCut;
    }
    const dc = this.getBudget(applId, fseId)?.dcRecAmt;
    const grantTotal = this.getGrantCostInfo(applId)?.dc;
    if (dc && grantTotal && grantTotal !== 0) {
      return (dc / grantTotal) * 100;
    }
    return 0;
  }

  totalCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.tcRecAmt || 0;
  }

  totalCostPercentCut(applId: number, fseId: number): number {
    this.logger.debug('tc can ===> ', this.getCan(applId, fseId)?.tcPctCut);
    if (this.getCan(applId, fseId)?.tcPctCut) {
      return this.getCan(applId, fseId).tcPctCut;
    }
    const tc = this.getBudget(applId, fseId)?.tcRecAmt;
    const grantTotal = this.getGrantCostInfo(applId)?.tc;
    if (tc && grantTotal && grantTotal !== 0) {
      return (tc / grantTotal) * 100;
    }
    return 0;
  }

  getBudget(applId: number, fseId: number): FundingReqBudgetsDto | null {
    const res = this.budgetMap.get(applId)?.get(fseId);
    return !!res ? res : null;
  }

  getCan(applId: number, fseId: number): FundingRequestCanDto | null {
    const can = this.canMap.get(applId)?.get(fseId);
    return !!can ? can : null;
  }

  getGrantCostInfo(applId: number): { dc: number, tc: number } | null {
    const gc = this.grantValues.get(applId);
    if (!!gc) {
      const res = {
        dc: gc.dc,
        tc: gc.tc
      };
      this.logger.debug('returning cost for applid', applId, '==', res);
      return res;
    }
    return null;
  }

  sourceDirectTotal(fseId: number): number {
    let sum = 0;
    this.budgetMap?.forEach(v => {
      v.forEach(b => {
        if (b.fseId === fseId) {
          sum += b.dcRecAmt;
        }
      });
    });
    return sum;
  }

  sourceTotalTotal(fseId: number): number {
    let sum = 0;
    this.budgetMap?.forEach(v => {
      v.forEach(b => {
        if (b.fseId === fseId) {
          sum += b.tcRecAmt;
        }
      });
    });
    return sum;
  }

  requestDirectTotal(applId: number): number {
    let sum = 0;
    this.budgetMap.get(applId)?.forEach(b => {
      sum += b.dcRecAmt;
    });
    return sum;
  }

  requestTotalTotal(applId: number): number {
    let sum = 0;
    this.budgetMap.get(applId)?.forEach(b => {
      sum += b.tcRecAmt;
    });
    return sum;
  }

  grandTotalDirect(): number {
    let sum = 0;
    this.budgetMap.forEach(v => {
      v.forEach(b => {
        sum += b.dcRecAmt;
      });
    });
    return sum;
  }

  grandTotalTotal(): number {
    let sum = 0;
    this.budgetMap.forEach(v => {
      v.forEach(b => {
        sum += b.tcRecAmt;
      });
    });
    return sum;
  }
}
