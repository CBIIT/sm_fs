import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from 'src/app/model/plan/plan-model';

@Component({
  selector: 'app-plan-step6',
  templateUrl: './plan-step6.component.html',
  styleUrls: ['./plan-step6.component.css']
})
export class PlanStep6Component implements OnInit {

  grantsSkipped: NciPfrGrantQueryDtoEx[];
  grantsNotConsidered: NciPfrGrantQueryDtoEx[];

  constructor(private navigationModel: NavigationStepModel,
              public planModel: PlanModel,
              private logger: NGXLogger,
              private router: Router) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(6, true);

    this.grantsSkipped = this.planModel.allGrants.filter( g =>
      ( !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
      g.priorityScoreNum >= this.planModel.minimumScore &&
      g.priorityScoreNum <= this.planModel.maximumScore) );
    this.logger.debug('funded grants are ', this.grantsSkipped);

    this.grantsNotConsidered = this.planModel.allGrants.filter(g =>
      (g.notSelectableReason && g.notSelectableReason.length > 0) ||
      (( g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore)
      && !g.selected ) );
    this.logger.debug('unfunded grants are ', this.grantsNotConsidered);

  }

}
