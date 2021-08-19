import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appFundingInformationValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: FundingInformationValidatorDirective, multi: true }]

})
export class FundingInformationValidatorDirective implements Validator {

  constructor(private logger: NGXLogger) {
  }

  validate(control: AbstractControl): ValidationErrors | null {
    this.logger.debug(control);
    return null;
  }

}
