import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { FundingRequestTypes } from '../model/request/funding-request-types';
import { NGXLogger } from 'ngx-logger';

@Directive({
  selector: '[appDiversitySupplementValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: DiversitySupplementValidatorDirective, multi: true }]
})
export class DiversitySupplementValidatorDirective implements Validator {
  @Input('appDiversitySupplementValidator') grantDoc: string;

  constructor(private logger: NGXLogger) {
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.grantDoc === 'CRCHD') {
      return null;
    }
    const cayCode = control.get('cancerActivities');
    const requestType = control.get('fundingRequestType');

    if (!cayCode || !requestType) {
      return null;
    }
    let ca: string;
    if (Array.isArray(cayCode.value) && cayCode.value.length > 0) {
      ca = cayCode.value[0];
    } else if (typeof cayCode.value === 'string' || cayCode.value instanceof String) {
      ca = String(cayCode.value);
    } else {
      ca = '';
    }

    if (ca !== 'MB') {
      return null;
    }

    if (![FundingRequestTypes.GENERAL_ADMINISTRATIVE_SUPPLEMENTS_ADJUSTMENT_POST_AWARD,
      FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS].includes(Number(requestType.value))) {
      return null;
    }

    return { mustSelectDiversitySupplement: true };
  }

}
