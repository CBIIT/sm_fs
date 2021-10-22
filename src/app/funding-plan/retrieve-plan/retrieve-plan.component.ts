import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FsPlanControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { PlanManagementService } from '../service/plan-management.service';
import { CanManagementService } from '../../cans/can-management.service';
import { PlanLoaderService } from './plan-loader.service';
import { ErrorFunction, SuccessFunction } from '../../funding-request/retrieve-request/request-loader.service';

@Component({
  selector: 'app-retrieve-plan',
  templateUrl: './retrieve-plan.component.html',
  styleUrls: ['./retrieve-plan.component.css']
})
export class RetrievePlanComponent implements OnInit {
  fprId: number;
  path: string;
  error = '';

  constructor(private router: Router,
              private planLoaderService: PlanLoaderService,
              private route: ActivatedRoute,
              private planModel: PlanModel,
              private planManagementService: PlanManagementService,
              private planService: FsPlanControllerService,
              private canMangementService: CanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.fprId = this.route.snapshot.params.fprId;
    this.path = '/plan/step6';

    if (this.fprId) {
      this.loadPlan(this.fprId, this.successFn.bind(this), this.errorFn.bind(this));
    } else {
      this.error = 'not found';
    }
  }

  successFn(): void {
    this.router.navigate([this.path]);
  }

  errorFn(e: string): void {
    this.error = e;
  }

  loadPlan(fprId: number, succesFn: SuccessFunction, errorFn: ErrorFunction): void {
    this.planService.retrieveFundingPlanUsingGET(fprId).subscribe(
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
