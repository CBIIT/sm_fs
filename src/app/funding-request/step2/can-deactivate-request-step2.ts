import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Injectable } from '@angular/core';
import { Step2Component } from './step2.component';
import { RequestLoaderService } from '../retrieve-request/request-loader.service';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivateRequestStep2 implements CanDeactivate<Step2Component> {

  private requestLoaded = false;

  constructor(
    private requestLoaderService: RequestLoaderService,
    private logger: NGXLogger) {
  }

  canDeactivate(
    component: Step2Component,
    route: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): boolean {

    const id = component.model.requestDto.frqId;

    if(nextState?.url?.startsWith('/error')) {
      return true;
    }
    if (nextState?.url?.startsWith('/request/step1')) {
      return true;
    } else if (nextState?.url?.startsWith('/request/step')) {
      // pre-emptively restore data until we have better checks in place.
      this.requestLoaderService.loadRequest(id, this.successFn.bind(this), this.errorFn.bind(this));
      return true;
    } else if (nextState?.url?.startsWith('/request/')) {
      return true;
    }

    if (component.step2Form.submitted) {
      return true;
    }

    // Object.keys(component.step2Form.controls).forEach(key => {
    //   this.logger.debug(key, component.step2Form.controls[key], component.step2Form.controls[key]._pendingDirty);
    // });

    // In this scenario, they are trying to leave the /request/ context and go elswhere, so we need to warn them
    // of unsaved changes.
    // if (!component.clean || component.step2Form.touched && component.step2Form.dirty) {
    const ret = confirm('Unsaved changes will be lost if you continue.');
    if (ret) {
      if (!!id) {
        this.requestLoaderService.loadRequest(id, this.successFn.bind(this), this.errorFn.bind(this));
      }
      return true;
    } else {
      return false;
    }
    // }
    // return true;
  }

  successFn(): void {
    this.requestLoaded = true;

  }

  errorFn(err: string): void {
    this.requestLoaded = true;
    this.logger.error(err);
  }
}
