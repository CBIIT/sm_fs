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
