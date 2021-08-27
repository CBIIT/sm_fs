import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { CancerActivityControllerService, RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NgForm } from '@angular/forms';
import { PlanInfoIssueTypeComponent } from '../plan-info-issue-type/plan-info-issue-type.component';

@Component({
  selector: 'app-funding-plan-information',
  templateUrl: './funding-plan-information.component.html',
  styleUrls: ['./funding-plan-information.component.css']
})
export class FundingPlanInformationComponent implements OnInit {
  @ViewChildren(PlanInfoIssueTypeComponent) planFoaDetails: QueryList<PlanInfoIssueTypeComponent>;
  @Input() parentForm: NgForm;
  rfaDetails: RfaPaNoticesDto[];
  totalApplicationsSelected: number;
  totalApplicationsReceived: number;
  totalApplicationsSkipped: number;
  totalApplicationsNotConsidered: number;
  listApplicationsSelected: NciPfrGrantQueryDtoEx[];
  listApplicationsSkipped: NciPfrGrantQueryDtoEx[];
  listApplicationsNotConsidered: NciPfrGrantQueryDtoEx[];
  listApplicationsNotSelectable: NciPfrGrantQueryDtoEx[];
  listApplicationsOutsideRange: NciPfrGrantQueryDtoEx[];


  constructor(public planModel: PlanModel,
              private rfaService: CancerActivityControllerService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.rfaDetails = [];
    this.planModel.grantsSearchCriteria.forEach(rfa => {
      this.rfaService.getRfaPaNoticeByNoticeNumberUsingGET(rfa.rfaPaNumber).subscribe(next => {
        this.rfaDetails.push(next);
      });
    });

    this.totalApplicationsReceived = this.planModel.allGrants.length;

    this.listApplicationsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.totalApplicationsSelected = this.listApplicationsSelected.length;

    const withinRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore);

    this.listApplicationsSkipped = withinRangeGrants.filter(g => !g.selected);
    this.totalApplicationsSkipped = this.listApplicationsSkipped.length;

    // Total number of not selectable grants
    this.listApplicationsNotSelectable = this.planModel.allGrants.filter(g => g.notSelectableReason?.length > 0);

    this.listApplicationsOutsideRange = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore);

    this.totalApplicationsNotConsidered = this.listApplicationsNotSelectable.length
      + this.listApplicationsOutsideRange.filter(g => !g.selected).length;

    this.listApplicationsNotConsidered = [];
    this.listApplicationsNotConsidered.concat(this.listApplicationsNotSelectable)
      .concat(this.listApplicationsOutsideRange.filter(g => !g.selected));
  }

}
