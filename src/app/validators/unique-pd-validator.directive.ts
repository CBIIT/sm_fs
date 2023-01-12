import { Directive } from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";
import {NGXLogger} from "ngx-logger";

@Directive({
  selector: '[appUniquePdValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: UniquePdValidatorDirective, multi: true }]
})
export class UniquePdValidatorDirective implements Validator {

  constructor(private logger: NGXLogger) { }

  validate(control: AbstractControl): ValidationErrors | null {
    const pd = control.get('pdName');
    this.logger.debug("pd:", pd);
    if (!pd || !pd.value) {
      return null;
    }
    const r00Pd = control.get('r00pdName');
    this.logger.debug("r00pd", r00Pd);
    if (!r00Pd || !r00Pd.value) {
      return null;
    }

    if(+r00Pd.value === +pd.value) {
      return { uniquePdsRequired: true };
    }

    return null;
  }

}
