import { Directive } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { INITIAL_PAY_TYPES, SKIP_TYPES } from '../model/request/funding-request-types';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appActiveFundingPlanValidator]',
  providers: [{ provide: NG_ASYNC_VALIDATORS, useExisting: ActiveFundingPlanValidatorDirective, multi: true }]

})
export class ActiveFundingPlanValidatorDirective implements AsyncValidator {

  constructor(private fsRequestService: FsRequestControllerService, private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    const initialPayType = INITIAL_PAY_TYPES.includes(Number(control.value)) || SKIP_TYPES.includes(Number(control.value));
    if (isNaN(control.value) || !initialPayType) {
      return new Promise(resolve => {
        // this.logger.debug('null');
        this.requestModel.initialPay = undefined;
        resolve(null);
      });
    }
    return undefined;
  }

}
