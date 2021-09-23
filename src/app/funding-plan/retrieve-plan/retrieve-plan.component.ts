import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FsPlanControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { PlanManagementService } from '../service/plan-management.service';
import { CanManagementService } from '../../cans/can-management.service';

@Component({
  selector: 'app-retrieve-plan',
  templateUrl: './retrieve-plan.component.html',
  styleUrls: ['./retrieve-plan.component.css']
})
export class RetrievePlanComponent implements OnInit {
  fprId: number;
  error = '';

  constructor(private router: Router,
              private route: ActivatedRoute,
              private planModel: PlanModel,
              private planManagementService: PlanManagementService,
              private planService: FsPlanControllerService,
              private canMangementService: CanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.fprId = this.route.snapshot.params.fprId;
    if (this.fprId) {
      this.planService.retrieveFundingPlanUsingGET(this.fprId).subscribe(
        (result) => {
          this.planModel.reset();
          this.planModel.title = 'View Plan Details for';
          this.planModel.returnToSearchLink = true;
          this.planModel.fundingPlanDto = result.FundingPlanDto;
          this.planModel.allGrants = result.AllGrants;
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
          this.planManagementService.buildPlanModel();
          this.planManagementService.buildGrantCostModel();
          this.planManagementService.buildOefiaTypeMaps();
          this.router.navigate(['/plan/step6']);
        },
        (error) => {
          this.logger.error('retrieveFundingPlan failed ', error);
          this.error = 'not found';
        }
      );
    } else {
      this.error = 'not found';
    }

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
