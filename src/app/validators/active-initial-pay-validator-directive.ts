import {Directive} from '@angular/core';
import {AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';
import {FsRequestControllerService} from '@nci-cbiit/i2ecws-lib';
import {RequestModel} from '../model/request/request-model';
import {Observable} from 'rxjs';
import {NGXLogger} from 'ngx-logger';

@Directive({
  selector: '[appActiveInitialPayValidator]',
  providers: [{provide: NG_ASYNC_VALIDATORS, useExisting: ActiveInitialPayValidatorDirective, multi: true}]
})
export class ActiveInitialPayValidatorDirective implements AsyncValidator {
  constructor(private fsRequestService: FsRequestControllerService, private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    if (!this.requestModel.isInitialPay() || !control || isNaN(control.value)) {
      return new Promise(resolve => {
        this.requestModel.initialPay = undefined;
        resolve(null);
      });
    }

    return new Promise(resolve => {
      this.fsRequestService.checkInitialPayUsingGET(this.requestModel.grant.applId, Number(control.value)).subscribe(result => {
        if (isNaN(result) || Number(result) === 0 || Number(result) === Number(this.requestModel.requestDto.frqId)) {
          this.requestModel.initialPay = undefined;
          resolve(null);
        } else {
          this.requestModel.initialPay = Number(result) !== 0 ? result : undefined;
          resolve({initialPayGrantExists: true});
        }
      });
    });
  }
}
