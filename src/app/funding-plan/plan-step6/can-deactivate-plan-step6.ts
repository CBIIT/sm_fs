import { CanDeactivate } from '@angular/router';
import { Injectable } from '@angular/core';
import { PlanStep6Component } from './plan-step6.component';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivatePlanStep6 implements CanDeactivate<PlanStep6Component> {

  /**
   * Checks if Step6 component can be deactivated.
   * If data sould be lost, it resets the plan model
   * @param component - @see PlanStep6Component
   * @return boolean if the step can be deactivated
   */
  canDeactivate(component: PlanStep6Component): boolean {
    if (component.isDirty()) {
      const ret = confirm('Unsaved changes will be lost if you continue.');
      return ret;
    }
    return true;
  }
}
