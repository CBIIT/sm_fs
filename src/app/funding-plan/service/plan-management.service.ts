import { EventEmitter, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { PlanModel } from '../../model/plan/plan-model';
import {
  CanCcxDto,
  FsRequestControllerService,
  FundingReqBudgetsDto,
  FundingRequestCanDto
} from '@nci-cbiit/i2ecws-lib';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { CanManagementService } from '../../cans/can-management.service';

@Injectable({
  providedIn: 'root'
})
export class PlanManagementService {
  fundingSourceValuesEmitter = new Subject<{ pd: number, ca: string }>();
  fundingSourceListEmitter = new Subject<FundingRequestFundsSrcDto[]>();
  grantInfoCostEmitter = new Subject<{ index: number, applId?: number, dc: number, tc: number }>();
  fundingSourceSelectionEmitter = new Subject<{ index: number, source: number }>();
  planBudgetReadOnlyEmitter = new Subject<boolean>();

  private _listSelectedSources: FundingRequestFundsSrcDto[];
  private _selectedSources: Map<number, number> = new Map<number, number>();
  private budgetMap: Map<number, Map<number, FundingReqBudgetsDto>>;
  private canMap: Map<number, Map<number, FundingRequestCanDto>>;
  // Tracks the applid and the source index where percent was selected
  private percentSelectedTracker: Map<number, number> = new Map<number, number>();
  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  inflightPFRs: Map<number, number> = new Map<number, number>();

  private fundedPlanTypes: FundingRequestTypes[] = [
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION,
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP,
    FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE
  ];
  private grantValues: Map<number, { index: number, applId?: number, dc: number, tc: number }>;
  private localRfy: Map<number, number>;
  private _selectedSourcesMap: Map<number, FundingRequestFundsSrcDto>;
  grantCosts: GrantCostPayload[];
  private defaultOefiaTypeMap: Map<number, number>;
  private selectedOefiaTypeMap: Map<number, number>;
  selectedPd: number;
  selectedCa: string;


  constructor(
    private planModel: PlanModel,
    private fsRequestService: FsRequestControllerService,
    private canManagementService: CanManagementService,
    private logger: NGXLogger) {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.grantValues = new Map<number, { index: number, applId?: number, dc: number, tc: number }>();
    this.grantInfoCostEmitter.subscribe(v => {
      // this.logger.debug('saving grant values', v);
      if (!!v.applId) {
        this.grantValues.set(v.applId, v);
      }
    });

    this.fundingSourceValuesEmitter.subscribe(next => {
      this.selectedPd = next.pd;
      this.selectedCa = next.ca;
    });

    this.buildPlanModel();
  }

  reset(): void {
    this.listSelectedSources = [];
  }

  get listSelectedSources(): FundingRequestFundsSrcDto[] {
    return this._listSelectedSources;
  }

  set listSelectedSources(value: FundingRequestFundsSrcDto[]) {
    this._listSelectedSources = value;
  }

  setPercentSelected(applId: number, sourceIndex: number, selected: boolean): void {
    if(selected) {
      this.percentSelectedTracker.set(applId, sourceIndex);
    } else {
      this.percentSelectedTracker.delete(applId);
    }
  }

  isPercentSelected(applId: number): boolean {
    const x = this.percentSelectedTracker.get(applId);
    return (x !== null && x !== undefined);
  }

  percentSelectionIndex(applId: number): number {
    return this.percentSelectedTracker.get(applId) || null;
  }

  buildPlanModel(): void {
    this.budgetMap = new Map<number, Map<number, FundingReqBudgetsDto>>();
    this.canMap = new Map<number, Map<number, FundingRequestCanDto>>();
    this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.forEach(r => {
      const buds = new Map(r.financialInfoDto.fundingReqBudgetsDtos.map(b => [b.fseId, b]));
      const cans = new Map(r.financialInfoDto.fundingRequestCans.map(c => [c.fseId, c]));
      this.budgetMap.set(Number(r.applId), buds);
      this.canMap.set(Number(r.applId), cans);
    });
    // this.logger.debug('budgets', this.budgetMap);
    // this.logger.debug('cans', this.canMap);
    // this.logger.debug('funding sources', this.planModel.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources);
    this._selectedSourcesMap =
      new Map(this.planModel.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources?.map(s => [s.fundingSourceId, s]));
    // this.logger.debug('source map', this.selectedSourcesMap);
    this._listSelectedSources = Array.from(this._selectedSourcesMap.values());
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
    // this.logger.debug('track selected sources', index, sourceId);

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
        // this.logger.debug('checking in flight PFRs for applid:', r.applId, '====> type:', r.frtId);
        this.fsRequestService.checkInitialPayUsingGET(r.applId, r.frtId).subscribe(result => {
          if (!isNaN(result) && Number(result) > 0) {
            this.inflightPFRs.set(r.applId, result);
            // this.logger.debug('in flight PFR found for applId:', r.applId, ':', result);
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
    let result: number = null;
    if (!!cans) {
      cans.forEach((c, s) => {
        result = c.approvedFutureYrs;
      });
    }
    this.setRecommendedFutureYears(applId, result);
    // this.logger.debug('RFY for can', applId, '=', result);
    return result;
  }

  directCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.dcRecAmt || 0;
  }

  directCostPercentCut(applId: number, fseId: number): number {
    if (this.getCan(applId, fseId)?.dcPctCut) {
      return this.getCan(applId, fseId).dcPctCut / 100;
    }
    const dc = this.getBudget(applId, fseId)?.dcRecAmt;
    const grantTotal = this.getGrantCostInfo(applId)?.dc;
    if (dc && grantTotal && grantTotal !== 0) {
      return (1 - (dc / grantTotal));
    }
    return 0;
  }

  totalCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.tcRecAmt || 0;
  }

  totalCostPercentCut(applId: number, fseId: number): number {
    if (this.getCan(applId, fseId)?.tcPctCut) {
      return this.getCan(applId, fseId).tcPctCut / 100;
    }
    const tc = this.getBudget(applId, fseId)?.tcRecAmt;
    const grantTotal = this.getGrantCostInfo(applId)?.tc;
    if (tc && grantTotal && grantTotal !== 0) {
      return (1 - (tc / grantTotal));
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

  get selectedSourcesMap(): Map<number, FundingRequestFundsSrcDto> {
    return this._selectedSourcesMap;
  }

  set selectedSourcesMap(value: Map<number, FundingRequestFundsSrcDto>) {
    this._selectedSourcesMap = value;
  }

  buildGrantCostModel(): void {
    this.grantCosts = [];
    let piDirect: number;
    let piTotal: number;
    let awardedTotal: number;
    let awardedDirect: number;

    this.logger.debug(JSON.stringify(this.planModel));

    this.planModel.allGrants.filter(g => g.selected).forEach(grant => {
      this.fsRequestService.getApplPeriodsUsingGET(grant.applId).subscribe(result => {
        // this.logger.debug('results =>', result);
        if (result && result.length > 0) {
          piDirect = Number(result[0].requestAmount);
          piTotal = Number(result[0].requestTotalAmount);
          awardedTotal = Number(result[0].totalAwarded);
          awardedDirect = Number(result[0].directAmount);
        } else {
          this.logger.error('No grant awards found for applid', grant.applId);
          piDirect = 0;
          piTotal = 0;
          awardedDirect = 0;
          awardedTotal = 0;
        }

        this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.filter(r => r.frtId === 1024 || r.frtId === 1026).forEach(req => {
          if (Number(req.applId) === Number(grant.applId)) {
            req.financialInfoDto.fundingRequestCans.forEach(can => {
              this.grantCosts.push({
                applId: grant.applId,
                fseId: can.fseId,
                octId: can.octId,
                oefiaTypeId: can.oefiaTypeId,
                nciSourceFlag: can.nciSourceFlag,
                fundingSourceName: can.fundingSourceName,
                approvedDirect: can.approvedDc,
                approvedTotal: can.approvedTc,
                requestedDirect: piDirect,
                requestedTotal: piTotal,
                bmmCodes: req.bmmCode,
                activityCodes: req.activityCode,
                frtId: req.frtId,
                totalPercentCut: this.calculatePercentCut(can.approvedTc, piTotal),
                directPercentCut: this.calculatePercentCut(can.approvedDc, piDirect),
              });
            });
          }
        });
      });
    });
    this.logger.debug('grantCosts', this.grantCosts);
  }

  buildOefiaTypeMaps(): void {
    this.defaultOefiaTypeMap = new Map<number, number>();
    this.selectedOefiaTypeMap = new Map<number, number>();
    this.planModel?.fundingPlanDto?.fpFinancialInformation?.fundingRequests?.forEach(r => {
      r.financialInfoDto?.fundingRequestCans?.forEach(c => {
        this.defaultOefiaTypeMap.set(c.fseId, c.oefiaTypeId);
        this.selectedOefiaTypeMap.set(c.fseId, c.octId);
      });
    });
  }


  private calculatePercentCut(approved: number, total: number): number | null {
    // this.logger.debug('calculatePercentCut', approved, total);
    if (isNaN(approved) || isNaN(total)) {
      return null;
    }

    return (1 - (approved / total));
  }


}

export interface GrantCostPayload {
  applId: number;
  fseId: number;
  octId?: number;
  oefiaTypeId?: number;
  fundingSourceName: string;
  approvedDirect: number;
  approvedTotal: number;
  requestedDirect: number;
  requestedTotal: number;
  directPercentCut: number;
  totalPercentCut: number;
  selectedCAN?: number;
  activityCodes: string;
  bmmCodes: string;
  frtId: number;
  nciSourceFlag?: string;
}
