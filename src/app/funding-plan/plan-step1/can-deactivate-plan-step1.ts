import { CanDeactivate } from '@angular/router';
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
  canDeactivate(component: PlanStep1Component): boolean {
    if (!component.canDeactivate) {
      const ret = confirm('Unsaved changes will be lost if you continue.');
      if (ret) {
        component.resetModel();
      }
    }
    return true;
  }
}
