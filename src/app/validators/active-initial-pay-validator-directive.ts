import { Directive } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { Observable } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { INITIAL_PAY_TYPES } from '../model/request/funding-request-types';

@Directive({
  selector: '[appActiveInitialPayValidator]',
  providers: [{ provide: NG_ASYNC_VALIDATORS, useExisting: ActiveInitialPayValidatorDirective, multi: true }]
})
export class ActiveInitialPayValidatorDirective implements AsyncValidator {
  constructor(private fsRequestService: FsRequestControllerService, private requestModel: RequestModel,
              private logger: NGXLogger) {
    this.logger.info('construction');
  }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    this.logger.debug('validate(', INITIAL_PAY_TYPES, INITIAL_PAY_TYPES.includes(Number(control.value)), control.value,
      this.requestModel.requestDto.frtId, this.requestModel.isInitialPay(), ')');
    if (isNaN(control.value) || !INITIAL_PAY_TYPES.includes(Number(control.value))) {
      return new Promise(resolve => {
        this.logger.debug('null');
        this.requestModel.initialPay = undefined;
        resolve(null);
      });
    }

    return new Promise(resolve => {
      this.fsRequestService.checkInitialPayUsingGET(this.requestModel.grant.applId, Number(control.value)).subscribe(result => {
        this.logger.debug('result:', result);
        if (isNaN(result) || Number(result) === 0 || Number(result) === Number(this.requestModel.requestDto.frqId)) {
          this.requestModel.initialPay = undefined;
          resolve(null);
        } else {
          this.requestModel.initialPay = Number(result) !== 0 ? result : undefined;
          resolve({ initialPayGrantExists: true });
        }
      });
    });
  }
}
