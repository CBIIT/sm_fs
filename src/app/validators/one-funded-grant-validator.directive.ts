import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appOneFundedGrantValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: OneFundedGrantValidatorDirective, multi: true }]
})
export class OneFundedGrantValidatorDirective implements Validator {

  constructor(private logger: NGXLogger) {
  }

  validate(control: AbstractControl): ValidationErrors | null {
    // this.logger.debug('--', control, '--');
    // this.logger.debug('--', Object.keys(control), '--');
    // this.logger.debug('--', Object.keys(control.controls), '--');
    const controlNames = Object.keys(control.controls);
    controlNames.forEach(key => {
      if (key.startsWith('prc_')) {
        const suffix = key.substring(4);

        const c = control.get(key);
        this.logger.debug(suffix, '--', key, '--', Object.keys(c?.controls));
      }
    });
    return undefined;
  }

}
