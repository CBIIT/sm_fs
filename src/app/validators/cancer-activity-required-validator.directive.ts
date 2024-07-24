import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appCancerActivityRequired]',
  providers: [{provide: NG_VALIDATORS, useExisting: CancerActivityRequiredValidatorDirective, multi: true}]
})
export class CancerActivityRequiredValidatorDirective implements Validator {
  constructor(private logger: NGXLogger) {
  }
  validate(control: AbstractControl): ValidationErrors | null {
    const cayCode = control.get('cancerActivities');

    if (!cayCode) {
      return null;
    }

    if (Array.isArray(cayCode.value) && cayCode.value.length > 0) {
      return null;
    } else if (typeof cayCode.value === 'string' || cayCode.value instanceof String) {
      return null;
    } else {
      return {cayCodeIsRequired: true};
    }
  }

}
