import {Directive} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';
import {NGXLogger} from 'ngx-logger';

@Directive({
  selector: '[appPdNameRequired]',
  providers: [{provide: NG_VALIDATORS, useExisting: PdNameRequiredValidatorDirective, multi: true}]
})
export class PdNameRequiredValidatorDirective implements Validator {
  constructor(private logger: NGXLogger) {

  }

  validate(control: AbstractControl): ValidationErrors | null {
    const pd = control.get('pdName');
    if (!pd) {
      return null;
    }
    if (!pd.value || isNaN(pd.value) || Number(pd.value) <= 0) {
      return {pdNameRequired: true};
    }
    return null;
  }

}
