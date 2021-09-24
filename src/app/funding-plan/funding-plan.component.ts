import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavigationStepModel } from '../funding-request/step-indicator/navigation-step.model';
import { PlanModel } from '../model/plan/plan-model';
import { PlanStep5Component } from './plan-step5/plan-step5.component';
import { PlanStep6Component } from './plan-step6/plan-step6.component';

@Component({
  selector: 'app-funding-plan',
  templateUrl: './funding-plan.component.html',
  styleUrls: ['./funding-plan.component.css'],
  providers: [NavigationStepModel]
})
export class FundingPlanComponent implements OnInit, OnDestroy {

  activeStep = {step: 0, name: '', route: null, screenName: ''};
  steps = [
    {step: 1, name: 'Select Grants', route: '/plan/step1', screenName: 'Select Grants'},
    {step: 2, name: 'Fundable Score', route: '/plan/step2', screenName: 'Fundable Score'},
    {step: 3, name: 'Plan Info', route: '/plan/step3', screenName: 'Plan Info'},
    {step: 4, name: 'Non-Funded Apps', route: '/plan/step4', screenName: 'Review Applications NOT Considered for Funding'},
    {step: 5, name: 'Supporting Docs', route: '/plan/step5', screenName: 'Supporting Docs'},
    {step: 6, name: 'Review', route: '/plan/step6', screenName: 'Review'}
  ];

  private routerSub: Subscription;

  model: PlanModel;
  stepComponent: any;
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
          if (val.urlAfterRedirects.includes(step.route)) {
            this.activeStep = step;
            break;
          }
        }
      }
    });

    // when direct access using url
    for (const step of this.steps) {
      if (this.router.url.includes(step.route)) {
        this.activeStep = step;
      }
    }
  }

  get showSteps(): boolean {
    return this.navigationModel.showSteps;
  }

  onActivate(componentRef): void {
    this.stepComponent = componentRef;
  }

  showGoToWorkflowButton(): boolean {
    if (this.stepComponent && this.stepComponent instanceof PlanStep6Component) {
      return this.stepComponent.showGoToWorkflowButton();
    }
    else {
      return false;
    }
  }

  goToWorkflow(): void {
    if (this.stepComponent && this.stepComponent instanceof PlanStep6Component) {
      this.stepComponent.goToWorkflow();
    }
  }
}
