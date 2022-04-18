import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RequestModel } from '../model/request/request-model';
import { GrantsSearchFilterService } from './grants-search/grants-search-filter.service';
import { NavigationStepModel } from './step-indicator/navigation-step.model';
import { Step4Component } from './step4/step4.component';
import { NavigationModel } from '../model/navigation-model';

@Component({
  selector: 'app-funding-request',
  templateUrl: './funding-request.component.html',
  styleUrls: ['./funding-request.component.css'],
  providers: [GrantsSearchFilterService, NavigationStepModel]
})
export class FundingRequestComponent implements OnInit, OnDestroy {
  activeStep = {step: 0, name: '', route: null};
  steps = [
    {step: 1, name: 'Select Grant', route: '/request/step1'},
    {step: 2, name: 'Request Info', route: '/request/step2'},
    {step: 3, name: 'Supporting Docs', route: '/request/step3'},
    {step: 4, name: 'Review', route: '/request/step4'}
  ];

  private routerSub: Subscription;

  model: RequestModel;
  stepComponent: any;
  requestsNav: NavigationModel;

  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private requestsNavigationModel: NavigationModel,
              private requestModel: RequestModel) {
  }

  ngOnDestroy(): void {
    if (this.routerSub && !this.routerSub.closed) {
      this.routerSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.model = this.requestModel;
    this.model.reset();
    this.requestsNav = this.requestsNavigationModel;

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
        break;
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
    if (this.stepComponent && this.stepComponent instanceof Step4Component) {
      return this.stepComponent.showGoToWorkflowButton();
    }
    else {
      return false;
    }
  }

  goToWorkflow(): void {
    if (this.stepComponent && this.stepComponent instanceof Step4Component) {
      this.stepComponent.goToWorkflow();
    }
  }
}
