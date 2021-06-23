import {Directive} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';
import {isArray} from 'rxjs/internal-compatibility';
import {NGXLogger} from 'ngx-logger';

@Directive({
  selector: '[appCancerActivityRequired]',
  providers: [{provide: NG_VALIDATORS, useExisting: CancerActivityRequiredValidatorDirective, multi: true}]
})
export class CancerActivityRequiredValidatorDirective implements Validator {
  constructor(private logger: NGXLogger) {
  }
  validate(control: AbstractControl): ValidationErrors | null {
    const cayCode = control.get('cancerActivities');
    this.logger.debug('Validating cayCode:', cayCode);

    if (!cayCode) {
      return null;
    }

    if (isArray(cayCode.value) && cayCode.value.length > 0) {
      this.logger.debug('cayCode has an array value of', cayCode.value);
      return null;
    } else if (typeof cayCode.value === 'string' || cayCode.value instanceof String) {
      this.logger.debug('cayCode has a string value of', cayCode.value);
      return null;
    } else {
      this.logger.debug('fail validation: cayCode is missing');
      return {cayCodeIsRequired: true};
    }

    return null;
  }

}
