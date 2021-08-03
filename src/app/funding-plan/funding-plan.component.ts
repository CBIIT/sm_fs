import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavigationStepModel } from '../funding-request/step-indicator/navigation-step.model';
import { PlanModel } from '../model/plan/plan-model';

@Component({
  selector: 'app-funding-plan',
  templateUrl: './funding-plan.component.html',
  styleUrls: ['./funding-plan.component.css'],
  providers: [NavigationStepModel]
})
export class FundingPlanComponent implements OnInit, OnDestroy {

  activeStep = {step: 0, name: '', route: null};
  steps = [
    {step: 1, name: 'Select Grants', route: '/plan/step1'},
    {step: 2, name: 'Fundable Score', route: '/plan/step2'},
    {step: 3, name: 'Plan Info', route: '/plan/step3'},
    {step: 4, name: 'Non-Funded Apps', route: '/plan/step4'},
    {step: 5, name: 'Supporting Docs', route: '/plan/step5'},
    {step: 6, name: 'Final Review', route: '/plan/step6 /plan/review'}
  ];

  private routerSub: Subscription;

  model;

  constructor(private router: Router,
              private navigationModel: NavigationStepModel,
              private planModel: PlanModel) {
  }

  ngOnDestroy(): void {
    if (this.routerSub && !this.routerSub.closed) {
      this.routerSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.model = this.planModel;

    this.routerSub = this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        for (const step of this.steps) {
          if (step.route.indexOf (val.urlAfterRedirects ) > -1 ) {
            this.activeStep = step;
            break;
          }
        }
      }
    });

    // when direct access using url
    for (const step of this.steps) {
      if (step.route.indexOf(this.router.url) > -1) {
        this.activeStep = step;
      }
    }
  }
}
