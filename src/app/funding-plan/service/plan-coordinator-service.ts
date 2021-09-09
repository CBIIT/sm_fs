import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { PlanModel } from '../../model/plan/plan-model';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class PlanCoordinatorService {
  fundingSourceValuesEmitter = new Subject<{ pd: number, ca: string }>();
  grantInfoCostEmitter = new Subject<{ index: number, dc: number, tc: number }>();
  fundingSourceSelectionEmitter = new Subject<{ index: number, source: number }>();
  private _selectedSources: Map<number, number> = new Map<number, number>();

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
  }

  trackSelectedSources(index: number, sourceId: number): void {
    // TODO: only track non-null

    if (!!sourceId) {
      this._selectedSources.set(index, sourceId);
    } else {
      this._selectedSources.delete(index);
    }
    this.logger.debug('trackSelectedSources():', index, sourceId, this._selectedSources.size);
  }

  get selectedSourceCount(): number {
    return this._selectedSources.size;
  }

  getRestrictedSources(index: number): number[] {
    this.logger.debug('checking restricted sources for #', index);
    const result: number[] = [] as number[];
    this._selectedSources.forEach((value, key) => {
      if (key !== index) {
        result.push(Number(value));
      }
    });
    this.logger.debug('restricted sources:', result);
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
}
