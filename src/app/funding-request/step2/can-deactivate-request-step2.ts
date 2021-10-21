import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Injectable } from '@angular/core';
import { Step2Component } from './step2.component';
import { RequestLoaderService } from '../retrieve-request/request-loader.service';
import { noop } from 'rxjs';

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

    if (nextState?.url?.startsWith('/request/step1/new')) {
      return true;
    }

    if (component.step2Form.submitted) {
      return true;
    }

    if (component.step2Form.touched && component.step2Form.dirty) {
      const ret = confirm('Unsaved changes will be lost if you continue.');
      if (ret) {
        this.logger.debug('time to reset the request model');
        const id = component.model.requestDto.frqId;
        setTimeout(this.timeOutFn.bind(this), 5000);
        this.requestLoaderService.loadRequest(id, this.successFn.bind(this), this.errorFn.bind(this));
        return true;
      } else {
        return false;
      }
    }
    return true;
  }

  successFn(): void {
    this.requestLoaded = true;

  }

  errorFn(err: string): void {
    this.requestLoaded = true;
    this.logger.error(err);
  }

  timeOutFn(): void {
    this.requestLoaded = true;
    this.logger.error('timeout');
  }
}
