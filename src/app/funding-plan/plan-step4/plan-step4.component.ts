import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
              private planModel: PlanModel,
              private router: Router) { }

  skipGrants: NciPfrGrantQueryDtoEx[];
  ncGrants: NciPfrGrantQueryDtoEx[];

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(4, true);
    this.skipGrants = this.planModel.allGrants.filter(g =>
      !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
      g.priorityScoreNum >= this.planModel.minimumScore &&
      g.priorityScoreNum <= this.planModel.maximumScore
    );

    this.ncGrants = this.planModel.allGrants.filter(g =>
      !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
      ( g.priorityScoreNum < this.planModel.minimumScore ||
        g.priorityScoreNum > this.planModel.maximumScore)
      );
  }

  saveContinue(): void {
    this.router.navigate(['/plan/step5']);
  }

  previous(): void {
    this.router.navigate(['/plan/step3']);
  }

}
