import { PlanStep3Component } from './plan-step3.component';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { PlanLoaderService } from '../retrieve-plan/plan-loader.service';
import { NGXLogger } from "ngx-logger";

@Injectable({ providedIn: 'root' })
export class CanDeactivatePlanStep3  {
  constructor(
    private logger: NGXLogger,
    private planLoaderService: PlanLoaderService) {
  }

  canDeactivate(
    component: PlanStep3Component,
    route: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): boolean {

    this.logger.debug('Route', route);
    this.logger.debug('Current state', currentState);
    this.logger.debug('Next state', nextState);

    const id = component.planModel.fundingPlanDto.fprId;

    const newUrl = nextState?.url;
    if (nextState?.url?.includes('error')) {
      return true;
    }
    // Allow them to go backwards without reloading
    if (nextState?.url?.startsWith('/plan/step2') || nextState?.url?.startsWith('/plan/step1')) {
      return true;
    }

    if(nextState?.url === '/plan') {
      this.logger.debug('new plan?');
      return true;
    }

    // TODO: Fix this. If they submit with errors, they can then go anywhere without warning
    if (component.step3form.submitted && component.step3form.valid) {
      return true;
    }

    this.logger.debug('', component.step3form);
    this.logger.debug('dirty  :', component.step3form.dirty);
    this.logger.debug('touched:', component.step3form.touched);

    const ret = confirm('Unsaved changes will be lost if you continue.');
    if (ret) {
      this.logger.debug('time to reload the plan model');
      if (!!id && !newUrl?.includes('new')) {
        this.planLoaderService.loadPlan(id, this.successFn.bind(this), this.errorFn.bind(this));
      }
      return true;
    } else {
      return false;
    }

    return true;
  }

  successFn(): void {
    this.logger.debug('success');
  }

  errorFn(err: string): void {
    this.logger.error(err);
  }
}
