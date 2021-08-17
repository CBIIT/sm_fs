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

  fundedGrants: NciPfrGrantQueryDtoEx[];
  unfundedGrants: NciPfrGrantQueryDtoEx[];

  constructor(private navigationModel: NavigationStepModel,
              public planModel: PlanModel,
              private logger: NGXLogger,
              private router: Router) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(6, true);

    this.fundedGrants = this.planModel.allGrants.filter(g => g.selected);
    this.logger.debug('funded grants are ', this.fundedGrants);

    this.unfundedGrants = this.planModel.allGrants.filter(g =>
      !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0));
    this.logger.debug('unfunded grants are ', this.unfundedGrants);

  }

}
