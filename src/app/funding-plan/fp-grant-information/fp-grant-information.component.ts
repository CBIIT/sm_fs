import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from '../../model/plan/plan-model';
import { GrantAwardedDto } from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import { NGXLogger } from 'ngx-logger';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { PlanManagementService } from '../service/plan-management.service';
import { RecommendedFutureYearsComponent } from '../recommended-future-years/recommended-future-years.component';
import { ControlContainer, NgForm } from '@angular/forms';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';

@Component({
  selector: 'app-fp-grant-information',
  templateUrl: './fp-grant-information.component.html',
  styleUrls: ['./fp-grant-information.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FpGrantInformationComponent implements OnInit {
  @ViewChild(RecommendedFutureYearsComponent) recommendedFutureYearsComponent: RecommendedFutureYearsComponent;
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() grantIndex: number;
  @Input() sourceIndex: number;
  @Input() parentForm: NgForm;
  @Input() readOnly = false;

  skip = false;
  exception = false;
  @Input() isModal = false;
  grantAwards: GrantAwardedDto[];
  piDirect: number;
  piTotal: number;
  private mySourceDetails: FundingRequestFundsSrcDto;

  recommendedFutureYears(): any {
    return this.planCoordinatorService.getRecommendedFutureYears(this.grant.applId);
  }

  constructor(
    public model: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private planCoordinatorService: PlanManagementService) {
  }

  ngOnInit(): void {
    this.skip = this.isSkip();
    this.exception = this.isException();

    this.requestService.getApplPeriodsUsingGET(this.grant.applId).subscribe(result => {
      this.piDirect = 0;
      this.piTotal = 0;
      this.grantAwards = result;
      if (result && result.length > 0) {
        this.piDirect = Number(result[0].requestAmount);
        this.piTotal = Number(result[0].requestTotalAmount);

      } else {
        this.logger.error('No grant awards found for applid', this.grant.applId);
        this.piDirect = 0;
        this.piTotal = 0;
      }
      // result.forEach(ga => {
      //   if (!isNaN(ga.requestAmount)) {
      //     this.piDirect += Number(ga.requestAmount);
      //   }
      //   if (!isNaN(ga.requestTotalAmount)) {
      //     this.piTotal += Number(ga.requestTotalAmount);
      //   }
      // });
      this.planCoordinatorService.grantInfoCostEmitter.next({
        index: this.grantIndex,
        applId: this.grant.applId,
        dc: this.piDirect,
        tc: this.piTotal
      });
    });
    this.planCoordinatorService.fundingSourceSelectionEmitter.subscribe(next => {
      if (next.index === this.sourceIndex) {
        this.mySourceDetails = next.source;
      }
    });
  }

  private isSkip(): boolean {
    return (!this.grant.selected && this.grant.priorityScoreNum &&
      this.grant.priorityScoreNum >= this.model.minimumScore && this.grant.priorityScoreNum <= this.model.maximumScore);
  }

  private isException(): boolean {
    return (this.grant.selected && this.grant.priorityScoreNum &&
      this.grant.priorityScoreNum > this.model.maximumScore);
  }

}
