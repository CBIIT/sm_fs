import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { PlanModel } from '../../model/plan/plan-model';
import { FsRequestControllerService, FundingReqBudgetsDto, FundingRequestCanDto } from '@cbiit/i2ecws-lib';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestFundsSrcDto } from '@cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { CanManagementService } from '../../cans/can-management.service';
import { PendingPrcValues } from '../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { isReallyANumber } from '../../utils/utils';
import { getOrderFunction, GrantCostPayload } from './grant-cost-payload';

@Injectable({
  providedIn: 'root'
})
export class PlanManagementService {
  private pendingValues: Map<number, PendingPrcValues> = new Map<number, PendingPrcValues>();

  fundingSourceValuesEmitter = new Subject<{ pd: number, ca: string }>();
  fundingSourceListEmitter = new Subject<FundingRequestFundsSrcDto[]>();
  grantInfoCostEmitter = new Subject<{ index: number, applId?: number, dc: number, tc: number }>();
  fundingSourceSelectionEmitter = new Subject<{ index: number, source: number }>();
  planBudgetReadOnlyEmitter = new Subject<boolean>();
  pendingValuesEmitter = new Subject<PendingPrcValues>();

  private _selectedSourcesMap: Map<number, FundingRequestFundsSrcDto>;
  private _listSelectedSources: FundingRequestFundsSrcDto[];
  private _restrictedSources: Map<number, number> = new Map<number, number>();

  private budgetMap: Map<number, Map<number, FundingReqBudgetsDto>>;
  private canMap: Map<number, Map<number, FundingRequestCanDto>>;
  public requestIdMap: Map<number, number> = new Map<number, number>();

  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  inflightPFRs: Map<number, number> = new Map<number, number>();
  private fundedPlanTypes: FundingRequestTypes[] = [
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION,
    FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP,
    FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE
  ];
  private grantValues: Map<number, { index: number, applId?: number, dc: number, tc: number }>;
  private localRfy: Map<number, number>;
  private _grantCosts: Array<GrantCostPayload>;
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

    this.buildPlanBudgetAndCanModel();
  }

  get grantCosts(): Array<GrantCostPayload> {
    this.sortGrantCosts();
    return this._grantCosts;
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

  addNewSelectedSource(source: FundingRequestFundsSrcDto): void {
    this._selectedSourcesMap.set(source.fundingSourceId, source);
    this._listSelectedSources = Array.from(this._selectedSourcesMap.values());
  }

  isPercentSelected(applId: number): boolean {
    let result = false;
    this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.forEach(r => {
      if (+r.applId === +applId) {
        r.financialInfoDto.fundingRequestCans?.forEach((can, index) => {
          if (can && isReallyANumber(can.dcPctCut) && isReallyANumber(can.tcPctCut) && can.dcPctCut === can.tcPctCut && can.dcPctCut !== 0 && can.tcPctCut !== 0) {
            // this.logger.debug(`Percent selected: ${applId} - ${index} - ${JSON.stringify(can)}`);
            result = true;
          }
        });
      }
    });
    // this.logger.warn('isPercentSelected:', applId, x, result);
    return result;
  }

  /**
   * Index is not a reliable identifier - there may not be any funding for a grant from a particular source, so its index
   * in the list of CANs might not correspond to its index in the funding sources table.
   */
  percentSelectionIndex(applId: number): { index, fseId } {
    let result: { index, fseId } = null;
    this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.forEach(r => {
      if (+r.applId === +applId) {
        r.financialInfoDto.fundingRequestCans?.forEach((can, index) => {
          if (can && isReallyANumber(can.dcPctCut) && isReallyANumber(can.tcPctCut) && can.dcPctCut === can.tcPctCut && can.dcPctCut !== 0 && can.tcPctCut !== 0) {
            result = {index, fseId: can.fseId};
          }
        });
      }
    });

    return result;
  }

  buildPlanBudgetAndCanModel(): void {
    this.budgetMap = new Map<number, Map<number, FundingReqBudgetsDto>>();
    this.canMap = new Map<number, Map<number, FundingRequestCanDto>>();

    this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.forEach(r => {
      this.requestIdMap.set(r.applId, r.frqId);
      const buds = new Map(r.financialInfoDto.fundingReqBudgetsDtos?.map(b => [b.fseId, b]));
      const cans = new Map(r.financialInfoDto.fundingRequestCans?.map(c => [c.fseId, c]));
      this.budgetMap.set(Number(r.applId), buds);
      this.canMap.set(Number(r.applId), cans);
    });
    this._selectedSourcesMap =
      new Map(this.planModel.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources?.map(s => [s.fundingSourceId, s]));
    // this.logger.debug('source map', this.selectedSourcesMap);
    this._listSelectedSources = Array.from(this._selectedSourcesMap.values());
  }

  // NOTE: this is for the purpose of restricting selections for the second and third funding sources
  trackRestrictedSources(index: number, sourceId: number): void {
    if (!!sourceId) {
      this._restrictedSources.set(index, +sourceId);
    } else {
      this._restrictedSources.delete(index);
    }
  }

  get selectedSourceCount(): number {
    return this._listSelectedSources.length;
  }

  recalculateRestrictedSources(): void {
    this._restrictedSources =
      new Map(this.planModel.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources?.map((s, i) => [i, s.fundingSourceId]));
  }

  getRestrictedSources(index: number): number[] {
    const result: number[] = [] as number[];
    this._restrictedSources.forEach((value, key) => {
      if (key !== index) {
        result.push(Number(value));
      }
    });
    return result;
  }

  checkInFlightPFRs(payload: { applId: number, frtId: number } []): void {
    payload.forEach(r => {
      if (this.fundedPlanTypes.includes(r.frtId)) {
        this.fsRequestService.checkInitialPayUsingGET(r.applId, r.frtId).subscribe(result => {
          if (!isNaN(result) && Number(result) > 0) {
            this.inflightPFRs.set(r.applId, result);
          }
        });
      }
    });
  }

  setRecommendedFutureYears(applId: number, rfy: number): void {
    // this.logger.debug(`setRecommendedFutureYears(${applId}, ${rfy})`);
    if (!this.localRfy) {
      this.localRfy = new Map<number, number>();
    }
    if (applId && rfy) {
      this.localRfy.set(applId, rfy);
    }
  }

  getRecommendedFutureYears(applId: number): number {
    if (!isNaN(this.localRfy?.get(applId))) {
      // this.logger.debug(`getRecommendedFutureYears(${applId}) == ${this.localRfy.get(applId)} [local]`);
      return this.localRfy.get(applId);
    }
    const cans = this.canMap.get(Number(applId));
    let result: number = null;
    if (!!cans) {
      cans.forEach((c, s) => {
        // this.logger.debug(`CAN: ${JSON.stringify(c)}::${s}`)
        result = c.approvedFutureYrs;
      });
    } else {
      this.logger.warn(`getRecommendedFutureYears(${applId}) == null [no CANs]`);
    }
    this.setRecommendedFutureYears(applId, result);
    // this.logger.debug(`getRecommendedFutureYears(${applId}) == ${result} [from CAN]`);
    // this.logger.debug('RFY for can', applId, '=', result);
    return result;
  }

  firstFunder(applId: number, fseId: number): boolean {
    // this source is not contributing
    const dc = this.directCost(applId, fseId);
    const tc = this.totalCost(applId, fseId);
    if (dc === 0 && tc === 0) {
      return false;
    }
    // if this is the only source of funds for this grant, return true
    if (this.sourceDirectTotal(fseId) === dc) {
      return true;
    }
    const sources: number[] = this.listSelectedSources.map(s => s.fundingSourceId);
    const targetIndex = sources.indexOf(+fseId);

    // This source is contributing and it's the first one
    if (targetIndex === 0) {
      return true;
    }

    let sum = 0;

    sources.forEach((src, idx) => {
      // this.logger.debug(`${applId}, ${fseId}, ${targetIndex}, ${src}, ${idx}, ${result}`);
      if ((idx < targetIndex) && !(+src === +fseId)) {
        sum += +this.directCost(applId, src) + +this.totalCost(applId, src);
      }
    });

    return sum === 0;
  }


  directCost(applId: number, fseId: number): number {
    return this.getBudget(applId, fseId)?.dcRecAmt || 0;
  }

  directCostPercentCut(applId: number, fseId: number): number {
    if (this.getCan(applId, fseId)?.dcPctCut) {
      return this.getCan(applId, fseId).dcPctCut / 100000;
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
      return this.getCan(applId, fseId).tcPctCut / 100000;
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
          if (b.dcRecAmt) {
            sum += +b.dcRecAmt;
          }
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
          if (b.tcRecAmt) {
            sum += +b.tcRecAmt;
          }
        }
      });
    });
    return sum;
  }

  requestDirectTotal(applId: number): number {
    let sum = 0;
    this.budgetMap.get(applId)?.forEach(b => {
      if (b.dcRecAmt) {
        sum += +b.dcRecAmt;
      }
    });
    return sum;
  }

  requestTotalTotal(applId: number): number {
    let sum = 0;
    this.budgetMap.get(applId)?.forEach(b => {
      if (b.tcRecAmt) {
        sum += +b.tcRecAmt;
      }
    });
    return sum;
  }

  grandTotalDirect(): number {
    let sum = 0;
    this.budgetMap.forEach(v => {
      v.forEach(b => {
        if (b.dcRecAmt) {
          sum += +b.dcRecAmt;
        }
      });
    });
    return sum;
  }

  grandTotalTotal(): number {
    let sum = 0;
    this.budgetMap.forEach(v => {
      v.forEach(b => {
        if (b.tcRecAmt) {
          sum += +b.tcRecAmt;
        }
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
    this._grantCosts = [];
    let piDirect: number;
    let piTotal: number;
    let awardedTotal: number;
    let awardedDirect: number;

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
              let g = {
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
              };
              if((!g.approvedDirect && !g.approvedTotal) || (g.approvedDirect === 0 && g.approvedTotal === 0)) {
                // do nothing
              } else {
                this._grantCosts.push(g);
              }
            });
          }
        });
      });
    });

    this.logger.debug('_grantCosts', this._grantCosts);
  }

  sortGrantCosts(): void {
    const fn = getOrderFunction(this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.map(s => s.fundingSourceId));
    this._grantCosts.sort(fn);
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

  public unfundedGrants(): number[] {
    // this.logger.debug(this.pendingValues);
    const result: number[] = [];
    const applIds: number[] = this.planModel.allGrants.filter(g => g.selected).map(gr => gr.applId);
    applIds.forEach(applId => {
      const tc = this.requestTotalTotal(applId);
      const dc = this.requestDirectTotal(applId);
      if (tc === 0 && dc === 0) {
        if (!this.hasPendingValues(applId)) {
          result.push(applId);
        }
      }
    });
    this.logger.debug(`List of unfunded grants: ${JSON.stringify(result)}`);
    return result;
  }

  hasPendingValues(applId: number): boolean {
    const vals: PendingPrcValues = this.pendingValues.get(+applId);
    if (!vals) {
      return false;
    }
    if (vals.displayType === 'percent') {
      return (vals.percentCut != null && !isNaN(vals.percentCut));
    } else {
      if (vals.directCost === null || vals.totalCost === null || isNaN(vals.directCost) || isNaN(vals.totalCost)) {
        return false;
      }
    }
    return true;
  }


  addPendingValues(vals: PendingPrcValues): void {
    this.logger.debug(`addPendingValues(${JSON.stringify(vals)})`);
    this.pendingValues.set(+vals.applId, vals);
    this.logger.debug(this.pendingValues);
  }
}


