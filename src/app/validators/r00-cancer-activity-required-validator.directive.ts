import { Directive } from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";
import {isArray} from "rxjs/internal-compatibility";

@Directive({
  selector: '[appR00CancerActivityRequiredValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: R00CancerActivityRequiredValidatorDirective, multi: true }]
})
export class R00CancerActivityRequiredValidatorDirective implements Validator {

  constructor() { }

  validate(control: AbstractControl): ValidationErrors | null {
    const cayCode = control.get('r00CancerActivity');

    if (!cayCode) {
      return null;
    }

    if (isArray(cayCode.value) && cayCode.value.length > 0) {
      return null;
    } else if (typeof cayCode.value === 'string' || cayCode.value instanceof String) {
      return null;
    } else {
      return {altCayCodeRequired: true};
    }
  }

}
