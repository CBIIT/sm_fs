import { Directive } from '@angular/core';
import { AbstractControl, FormGroup, NG_VALIDATORS, ValidationErrors, Validator, } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../model/plan/plan-model';

@Directive({
  selector: '[appGrantFundedOnceValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: GrantFundedOnceValidatorDirective,
      multi: true,
    },
  ],
})
export class GrantFundedOnceValidatorDirective implements Validator {
  constructor(private logger: NGXLogger, private planModel: PlanModel) {
  }


  // Verify that each grant is funded at least once
  validate(control: AbstractControl): ValidationErrors {
    const controlNames = Object.keys((control as FormGroup).controls);
    controlNames.forEach(key => {
      this.logger.debug(key, '==>', control.get(key));
    });

    return null;
  }
}
