import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { CancerActivityControllerService, RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-funding-plan-information',
  templateUrl: './funding-plan-information.component.html',
  styleUrls: ['./funding-plan-information.component.css']
})
export class FundingPlanInformationComponent implements OnInit {
  rfaDetails: RfaPaNoticesDto[];
  applicationsSelected: number;
  applicationsReceived: number;
  applicationsSkipped: number;
  applicationsNotConsidered: number;

  constructor(public planModel: PlanModel,
              private rfaService: CancerActivityControllerService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.rfaDetails = [];
    this.planModel.grantsSearchCriteria.forEach(rfa => {
      this.rfaService.getRfaPaNoticeByNoticeNumberUsingGET(rfa.rfaPaNumber).subscribe(next => {
        this.logger.debug(next);
        this.rfaDetails.push(next);
      });
    });

    this.applicationsReceived = this.planModel.allGrants.length;

    this.applicationsSelected = this.planModel.allGrants.filter(g => g.selected).length;

    const withinRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore);
    this.logger.debug('within range:', withinRangeGrants);

    this.logger.debug(withinRangeGrants.filter(g => !g.selected).length);

    this.applicationsSkipped = withinRangeGrants.filter(g => !g.selected).length;

    // Total number of not selectable grants
    const totalNotSelectable = this.planModel.allGrants.filter(g => g.notSelectableReason?.length > 0).length;
    this.logger.debug('not selectable', totalNotSelectable);

    const outsideRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore);

    this.applicationsNotConsidered = totalNotSelectable + outsideRangeGrants.filter(g => !g.selected).length;

  }


}
