import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { first } from 'rxjs/operators';

@Directive({
  selector: '[appFpSetAsideValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: FpSetAsideValidatorDirective, multi: true }]

})
export class FpSetAsideValidatorDirective implements Validator {

  constructor(private logger: NGXLogger) {
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const firstYearSetAside = control.get('firstYearSetAside');
    const totalSetAside = control.get('totalSetAside');
    const outYears = [control.get('outYear2')?.value, control.get('outYear3')?.value, control.get('outYear4')?.value, control.get('outYear5')?.value];
    this.logger.debug('firstYearSetAside:', firstYearSetAside);
    this.logger.debug('totalSetAside:', totalSetAside);
    this.logger.debug('outYears:', outYears);
    if (!isNaN(firstYearSetAside.value) && !isNaN(totalSetAside.value)) {
      if (Number(totalSetAside.value) < Number(firstYearSetAside.value)) {
        return { totalSetAsideLessThanFirstYear: true };
      }
    }
    return undefined;
  }

}
