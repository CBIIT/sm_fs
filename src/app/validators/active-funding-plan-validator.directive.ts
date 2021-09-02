import { Directive } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';

@Directive({
  selector: '[appActiveFundingPlanValidator]',
  providers: [{ provide: NG_ASYNC_VALIDATORS, useExisting: ActiveFundingPlanValidatorDirective, multi: true }]

})
export class ActiveFundingPlanValidatorDirective implements AsyncValidator {

  constructor() {
  }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return undefined;
  }

}
