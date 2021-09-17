import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot} from '@angular/router';
import { PlanStep1Component } from './plan-step1.component';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivatePlanStep1 implements CanDeactivate<PlanStep1Component> {

  /**
   * Checks if Step1 component can be deactivated.
   * If data sould be lost, it resets the plan model
   * @param component - @see PlanStep1Component
   * @return boolean if the step can be deactivated
   */
  canDeactivate(component: PlanStep1Component, route: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot): boolean {
    if (nextState && nextState.url && nextState.url.startsWith('/plan/step')) {
      return true;
    }
    if (!component.canDeactivate) {
      //console.log(route);
      //console.log(currentState);
      //console.log(nextState);
      const ret = confirm('Unsaved changes will be lost if you continue.');
      if (ret) {
        component.resetModel();
        return true;
      }
      return false;

    }
    return true;
  }
}
