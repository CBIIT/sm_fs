import { Directive } from '@angular/core';
import { AbstractControl, FormGroup, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appOneFundedGrantValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: OneFundedGrantValidatorDirective, multi: true }]
})
export class OneFundedGrantValidatorDirective implements Validator {

  constructor(private logger: NGXLogger) {
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const noVals: boolean[] = [];
    const controlNames = Object.keys((control as FormGroup).controls);
    controlNames.forEach(key => {
      if (key.startsWith('prc_')) {

        const c = control.get(key);
        const dc = c.get('directCost');
        const tc = c.get('totalCost');
        const pc = c.get('percentCut');

        // this.logger.debug(key, '--', dc?.value, '--', tc?.value, '--', pc?.value);
        if (dc === null && pc === null && tc === null) {
          noVals.push(true);
        } else {
          noVals.push(false);
        }
      }
    });

    if (noVals.length > 0) {
      if (noVals.filter(i => !i).length === 0) {
        return { atLeastOneGrantMustBeFunded: true };
      }
    }
    return null;
  }

}
