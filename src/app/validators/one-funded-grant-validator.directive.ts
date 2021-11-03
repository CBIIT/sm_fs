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

  // Verify that at least one grant is funded by this funding source
  validate(control: AbstractControl): ValidationErrors | null {
    const notFunded: boolean[] = [];
    const controlNames = Object.keys((control as FormGroup).controls);
    controlNames.forEach(key => {
      if (key.startsWith('prc_')) {

        const c = control.get(key);
        const dc = c.get('directCost');
        const tc = c.get('totalCost');
        const pc = c.get('percentCut');

        // this.logger.debug(key, '--', dc?.value, '--', tc?.value, '--', pc?.value);
        
        // Let me explain the approach: for each Program Recommended Costs control in the form, I 
        // check whether the user has provided values or not, and push true or false into the array
        // accordingly. It really doesn't matter what value we use, because all we want to know is
        // whether they're all the same. Since I'm using booleans, the filter below drops all the
        // true values. The size of the resulting list tells me the number of grants that are 
        // funded by this source. If it's zero, we throw the error.
        if (dc === null && pc === null && tc === null) {
          notFunded.push(true);
        } else {
          notFunded.push(false);
        }
      }
    });

    if (notFunded.length > 0) {
      // this.logger.debug('--', notFunded, '--', notFunded.filter(i => !i), '--', notFunded.filter(i => !i).length);
      if (notFunded.filter(i => !i).length === 0) {
        // this.logger.debug('error');
        return { atLeastOneGrantMustBeFunded: true };
      } else {
        // this.logger.debug('no error');
        return undefined;
      }
    }
    // this.logger.debug('default no error');
    return undefined;
  }

}
