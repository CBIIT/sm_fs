import { Injectable } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { ErrorFunction, SuccessFunction } from '../../funding-request/retrieve-request/request-loader.service';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';
import { FsPlanControllerService } from '@cbiit/i2ecws-lib';
import { CustomServerLoggingService } from '@cbiit/i2ecui-lib';

@Injectable({ providedIn: 'root' })
export class PlanLoaderService {
  constructor(
    private logger: CustomServerLoggingService,
    private planModel: PlanModel,
    private planManagementService: PlanManagementService,
    private planService: FsPlanControllerService) {
  }

  loadPlan(fprId: number, succesFn: SuccessFunction, errorFn: ErrorFunction): void {
    this.logger.info(`Loading funding plan ${fprId}`);
    this.planService.retrieveFundingPlan(fprId).subscribe(
      (result) => {
        this.logger.info(`Plan ${fprId} loaded. Proceeding with initialization`);
        this.planModel.reset();
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
        this.planManagementService.buildPlanBudgetAndCanModel();
        this.planManagementService.buildGrantCostModel();
        this.planManagementService.buildOefiaTypeMaps();
        this.planManagementService.recalculateRestrictedSources();
        this.planManagementService.assessPlanCANs();
        this.logger.info(`Plan ${fprId} loaded and initialized. Proceed with navigation.`);

        if (succesFn) {
          succesFn();
        }
      },
      (error) => {
        this.logger.logErrorWithContext(`loadPlan(${fprId}) failed`, error);
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
