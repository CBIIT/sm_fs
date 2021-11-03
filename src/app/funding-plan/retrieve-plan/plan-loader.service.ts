import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { ErrorFunction, SuccessFunction } from '../../funding-request/retrieve-request/request-loader.service';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';
import { FsPlanControllerService } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';

@Injectable({ providedIn: 'root' })
export class PlanLoaderService {
  constructor(
    private logger: NGXLogger,
    private planModel: PlanModel,
    private planManagementService: PlanManagementService,
    private planService: FsPlanControllerService) {
  }

  loadPlan(fprId: number, succesFn: SuccessFunction, errorFn: ErrorFunction): void {
    this.planService.retrieveFundingPlanUsingGET(fprId).subscribe(
      (result) => {
        this.planModel.reset();
        // these 2 properties shoule be set in the case of creating new plan.
        // this.planModel.title = 'View Plan Details for';
        // this.planModel.returnToSearchLink = true;
        this.planModel.fundingPlanDto = result.FundingPlanDto;
        this.planModel.allGrants = result.AllGrants;
        this.planModel.sortGrantsByPriorityAndPI();
        this.planModel.minimumScore = this.planModel.fundingPlanDto.fundableRangeFrom;
        this.planModel.maximumScore = this.planModel.fundingPlanDto.fundableRangeTo;
        this.planModel.markMainApproversCreated();
        const selectedApplIds: number[] = result.SelectedApplIds;

        if (selectedApplIds && this.planModel.allGrants) {
          this.planModel.allGrants.forEach(g => {
            g.selected = selectedApplIds.includes(Number(g.applId));
          });
        }

        if (this.planModel.allGrants) {
          this.planModel.allGrants.forEach(g => this.addRfaNcabToSearchCriteria(g));
        }
        this.planModel.takeDocumentSnapshot();
        this.logger.debug('retrieved plan:', JSON.stringify(this.planModel.fundingPlanDto));
        this.planManagementService.buildPlanBudgetAndCanModel();
        this.planManagementService.buildGrantCostModel();
        this.planManagementService.buildOefiaTypeMaps();
        this.planManagementService.recalculateRestrictedSources();

        if (succesFn) {
          succesFn();
        }
        // this.router.navigate([this.path]);
      },
      (error) => {
        this.logger.error('retrieveFundingPlan failed ', error);
        if (errorFn) {
          errorFn(error);
        }
      }
    );
  }

  addRfaNcabToSearchCriteria(g: NciPfrGrantQueryDtoEx): void {
    for (const rfaNcab of this.planModel.grantsSearchCriteria) {
      if (rfaNcab.rfaPaNumber === g.rfaPaNumber) {
        if (!rfaNcab.ncabDates.includes(g.councilMeetingDate)) {
          rfaNcab.ncabDates.push(g.councilMeetingDate);
        }
        return;
      }
    }
    this.planModel.grantsSearchCriteria.push({ rfaPaNumber: g.rfaPaNumber, ncabDates: [g.councilMeetingDate] });
  }

}
