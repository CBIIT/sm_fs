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
    this.logger.debug('--', control, '--');
    return undefined;
  }

}
