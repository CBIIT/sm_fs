import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Injectable } from '@angular/core';
import { Step2Component } from './step2.component';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivateRequestStep2 implements CanDeactivate<Step2Component> {

  constructor(private logger: NGXLogger) {
  }

  canDeactivate(
    component: Step2Component,
    route: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): boolean {

    if (nextState?.url?.startsWith('/request/step1/new')) {
      return true;
    }

    if (component.step2Form.submitted) {
      return true;
    }

    if (component.step2Form.dirty) {
      const ret = confirm('Unsaved changes will be lost if you continue.');
      if (ret) {
        this.logger.debug('time to reset the request model');
        return true;
      } else {
        return false;
      }
    }

    //   if (nextState && nextState.url && nextState.url.startsWith('/plan/step')) {
    //     return true;
    //   }
    //   if (!component.canDeactivate) {
    //     //console.log(route);
    //     //console.log(currentState);
    //     //console.log(nextState);
    //     const ret = confirm('Unsaved changes will be lost if you continue.');
    //     if (ret) {
    //       component.resetModel();
    //       return true;
    //     }
    //     return false;

    //   }
    return true;
  }
}
