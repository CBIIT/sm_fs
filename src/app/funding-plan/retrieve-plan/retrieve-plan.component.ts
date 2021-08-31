import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FsPlanControllerService, FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { ConversionActivityCodes } from '../../type4-conversion-mechanism/conversion-activity-codes';
import { CanManagementService } from '../../cans/can-management.service';
import { PlanModel } from 'src/app/model/plan/plan-model';

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
              private planService: FsPlanControllerService,
              private userSessionService: AppUserSessionService,
              private canManagementService: CanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.fprId = this.route.snapshot.params.fprId;
    if (this.fprId) {
      this.planService.retrieveFundingPlanUsingGET(this.fprId).subscribe(
        (result) => {
          this.planModel.reset();
          this.planModel.title = 'View Funding Plan Details for';
        //  this.planModel.returnToRequestPageLink = true;
          this.planModel.fundingPlanDto = result.FundingPlanDto;
          this.planModel.allGrants = result.AllGrants;
          this.planModel.minimumScore = this.planModel.fundingPlanDto.fundableRangeFrom;
          this.planModel.maximumScore = this.planModel.fundingPlanDto.fundableRangeTo;
          this.planModel.markMainApproversCreated();
          const selectedApplIds: number[] = result.SelectedApplIds;

          if (selectedApplIds && this.planModel.allGrants) {
              this.planModel.allGrants.forEach( g => g.selected = selectedApplIds.includes(g.applId));
          }
          this.logger.debug('retrieved planModel ', this.planModel);
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

}
