import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from 'src/app/model/plan/plan-model';

@Component({
  selector: 'app-plan-step4',
  templateUrl: './plan-step4.component.html',
  styleUrls: ['./plan-step4.component.css']
})
export class PlanStep4Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel,
              public planModel: PlanModel,
              private logger: NGXLogger,
              private router: Router) {
              }

  skGrants: NciPfrGrantQueryDtoEx[];
  ncGrants: NciPfrGrantQueryDtoEx[];

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(4, true);

    setTimeout(() => {
      this.skGrants = this.planModel.allGrants.filter( g =>
        ( !g.selected &&
        (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
        g.priorityScoreNum >= this.planModel.minimumScore &&
        g.priorityScoreNum <= this.planModel.maximumScore) );
      this.logger.debug('skip grants are ', this.skGrants);
      this.ncGrants = this.planModel.allGrants.filter(g =>
        (g.notSelectableReason && g.notSelectableReason.length > 0) ||
        (( g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore)
        && !g.selected ) );
      this.logger.debug('not considered grants are ', this.ncGrants);
   }, 0);
  }

  saveContinue(): void {
    this.router.navigate(['/plan/step5']);
  }

  previous(): void {
    this.router.navigate(['/plan/step3']);
  }

  get noSkipResult(): boolean {
    return !this.skGrants || this.skGrants.length === 0;
  }

  get noAppNotFundingResult(): boolean {
    return !this.ncGrants || this.ncGrants.length === 0;
  }
}
