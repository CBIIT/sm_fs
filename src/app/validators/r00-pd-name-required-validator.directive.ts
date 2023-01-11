import { Directive } from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";

@Directive({
  selector: '[appR00PdNameRequiredValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: R00PdNameRequiredValidatorDirective, multi: true }]
})
export class R00PdNameRequiredValidatorDirective implements Validator {

  constructor() { }

  validate(control: AbstractControl): ValidationErrors | null {
    const pd = control.get('r00pdName');
    if (!pd) {
      return null;
    }
    if (!pd.value || isNaN(pd.value) || Number(pd.value) <= 0) {
      return {altPdNameRequired: true};
    }
    return null;
  }

}
