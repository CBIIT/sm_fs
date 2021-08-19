import { Component, Input, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { CancerActivityControllerService, RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-funding-plan-information',
  templateUrl: './funding-plan-information.component.html',
  styleUrls: ['./funding-plan-information.component.css']
})
export class FundingPlanInformationComponent implements OnInit {
  @Input() parentForm: NgForm;
  rfaDetails: RfaPaNoticesDto[];
  totalApplicationsSelected: number;
  totalApplicationsReceived: number;
  totalApplicationsSkipped: number;
  totalApplicationsNotConsidered: number;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];

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

    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.totalApplicationsSelected = this.listGrantsSelected.length;

    const withinRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore);

    this.totalApplicationsSkipped = withinRangeGrants.filter(g => !g.selected).length;

    // Total number of not selectable grants
    const totalNotSelectable = this.planModel.allGrants.filter(g => g.notSelectableReason?.length > 0).length;

    const outsideRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore);

    this.totalApplicationsNotConsidered = totalNotSelectable + outsideRangeGrants.filter(g => !g.selected).length;
  }

}
