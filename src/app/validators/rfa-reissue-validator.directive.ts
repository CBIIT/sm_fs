import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appRfaReissueValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: RfaReissueValidatorDirective, multi: true }]

})
export class RfaReissueValidatorDirective implements Validator {

  constructor(private logger: NGXLogger) {
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const issueType = control.get('issueType');
    const priorNotice = control.get('priorNotice');
    this.logger.info('issueType:', issueType);
    this.logger.info('priorNotice:', priorNotice);
    return undefined;
  }

}
