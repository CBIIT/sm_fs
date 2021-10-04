import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appFpMultiSourceValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: FpMultiSourceValidatorDirective, multi: true }]
})
export class FpMultiSourceValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    this.logger.debug('Multi-source validation: ', control);
    return undefined;
  }

  constructor(private logger: NGXLogger) {
  }

}
