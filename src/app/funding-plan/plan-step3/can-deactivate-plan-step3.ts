import { PlanStep3Component } from './plan-step3.component';
import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Injectable } from '@angular/core';
import { PlanLoaderService } from '../retrieve-plan/plan-loader.service';

@Injectable({ providedIn: 'root' })
export class CanDeactivatePlanStep3 implements CanDeactivate<PlanStep3Component> {
  constructor(
    private logger: NGXLogger,
    private planLoaderService: PlanLoaderService) {
  }

  canDeactivate(
    component: PlanStep3Component,
    route: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): boolean {
    const id = component.planModel.fundingPlanDto.fprId;

    // if (nextState?.url?.startsWith('/request/step1')) {
    //   return true;
    // } else if (nextState?.url?.startsWith('/request/step')) {
    //   // pre-emptively restore data until we have better checks in place.
    //   this.planLoaderService.loadPlan(id, this.successFn.bind(this), this.errorFn.bind(this));
    //   return true;
    // } else if (nextState?.url?.startsWith('/request/')) {
    //   return true;
    // }

    if (component.step3form.submitted) {
      return true;
    }

    this.logger.debug('', component.step3form);
    this.logger.debug('dirty  :', component.step3form.dirty);
    this.logger.debug('touched:', component.step3form.touched);

    const ret = confirm('Unsaved changes will be lost if you continue.');
    if (ret) {
      this.logger.debug('time to reset the plan model');
      if (!!id) {
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
