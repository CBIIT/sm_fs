import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';
import {Directive, Input} from '@angular/core';
import {NGXLogger} from 'ngx-logger';

@Directive({
  selector: '[appMinMaxValidator]',
  providers: [{provide: NG_VALIDATORS, useExisting: MinMaxValidatorDirective, multi: true}]
})
export class MinMaxValidatorDirective implements Validator {
  @Input('appMinMaxValidator') minMax: { min: number, max: number };

  constructor(private logger: NGXLogger) {

  }

  validate(control: AbstractControl): ValidationErrors | null {

    this.logger.debug('minMaxValidation on control', control);
    this.logger.debug(this.minMax);
    const val = control.value;
    if (isNaN(val)) {
      return null;
    }
    if (Number(val) < this.minMax.min) {
      return {min: true};
    }
    if (Number(val) > this.minMax.max) {
      return {max: true};
    }
    return null;
  }

}
