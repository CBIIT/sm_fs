import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { PlanManagementService } from '../funding-plan/service/plan-management.service';

@Directive({
  selector: '[appGrantFundedOnceValidator]',
  providers: [{ provide: NG_VALIDATORS, useExisting: GrantFundedOnceValidatorDirective, multi: true, },],
})
export class GrantFundedOnceValidatorDirective implements Validator {
  @Input('appGrantFundedOnceValidator') applId: number;

  constructor(private logger: NGXLogger, private planManagementService: PlanManagementService) {
  }


  // Verify that each grant is funded at least once
  validate(control: AbstractControl): ValidationErrors {
    if (!this.applId) {
      return null;
    }

    const unfundedGrants = this.planManagementService.unfundedGrants();
    if (unfundedGrants?.includes(+this.applId)) {
      return { grantUnfunded: true };
    }

    return null;
  }
}
