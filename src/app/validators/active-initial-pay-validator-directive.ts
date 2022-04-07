import { Directive } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { FsRequestControllerService } from '@cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { Observable } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { INITIAL_PAY_TYPES, SKIP_TYPES } from '../model/request/funding-request-types';

@Directive({
  selector: '[appActiveInitialPayValidator]',
  providers: [{ provide: NG_ASYNC_VALIDATORS, useExisting: ActiveInitialPayValidatorDirective, multi: true }]
})
export class ActiveInitialPayValidatorDirective implements AsyncValidator {
  constructor(private fsRequestService: FsRequestControllerService, private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    const initialPayType = INITIAL_PAY_TYPES.includes(Number(control.value)) || SKIP_TYPES.includes(Number(control.value));
    // this.logger.debug('value:', control.value, '-- request type:', this.requestModel.requestDto.frtId, '-- initialPay:',
    //   this.requestModel.isInitialPay(), initialPayType);
    if (isNaN(control.value) || !initialPayType) {
      return new Promise(resolve => {
        // this.logger.debug('null');
        this.requestModel.initialPay = undefined;
        resolve(null);
      });
    }

    return new Promise(resolve => {
      this.fsRequestService.checkInitialPay(this.requestModel.grant.applId, Number(control.value)).subscribe(result => {
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
