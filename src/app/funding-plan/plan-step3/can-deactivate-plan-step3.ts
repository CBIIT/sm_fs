import { PlanStep3Component } from './plan-step3.component';
import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CanDeactivatePlanStep3 implements CanDeactivate<PlanStep3Component> {
  constructor(private logger: NGXLogger) {
  }

  canDeactivate(
    component: PlanStep3Component,
    route: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): boolean {
    this.logger.debug(component);
    this.logger.debug(route);
    this.logger.debug(currentState);
    this.logger.debug(nextState);
    return true;
  }
}
