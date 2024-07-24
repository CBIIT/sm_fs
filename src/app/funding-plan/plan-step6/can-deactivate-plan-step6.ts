import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { PlanStep6Component } from './plan-step6.component';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivatePlanStep6  {

  /**
   * Checks if Step6 component can be deactivated.
   * If data sould be lost, it resets the plan model
   * @param component - @see PlanStep6Component
   * @return boolean if the step can be deactivated
   */
  canDeactivate(component: PlanStep6Component, route: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot): boolean {
    if (nextState && nextState.url && nextState.url.startsWith('/plan/step')) {
      return true;
    }
    if (component.isDirty()) {
      const ret = confirm('Unsaved changes will be lost if you continue.');
      if (ret) {
        component.clearAlerts();
      }
      return ret;
    }
    component.clearAlerts();
    return true;
  }
}
