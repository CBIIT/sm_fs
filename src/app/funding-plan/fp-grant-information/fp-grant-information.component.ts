import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  @ViewChild('collapseAll') collapseAll: ElementRef<HTMLElement>;
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() grantIndex: number;
  @Input() sourceIndex: number;
  @Input() parentForm: NgForm;
  @Input() readOnly = false;
  @Input() checkFunding = true;


  skip = false;
  exception = false;
  @Input() isModal = false;
  grantAwards: GrantAwardedDto[];
  piDirect: number;
  piTotal: number;
  fundingSourcesCount: number;

  recommendedFutureYears(): any {
    return this.planManagementService.getRecommendedFutureYears(this.grant.applId);
  }

  constructor(
    public model: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private planManagementService: PlanManagementService) {
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

      this.planManagementService.grantInfoCostEmitter.next({
        index: this.grantIndex,
        applId: this.grant.applId,
        dc: this.piDirect,
        tc: this.piTotal
      });
        // collapse the grant info second part when funding sources more than 2 
       this.fundingSourcesCount=this.planManagementService.listSelectedSources.length;
       if(this.fundingSourcesCount>2){
        const el: HTMLElement = this.collapseAll.nativeElement;
        el.click();
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
  get listSelectedSourcesLength(): Number {
    return this.planManagementService.listSelectedSources.length;
  }
}
