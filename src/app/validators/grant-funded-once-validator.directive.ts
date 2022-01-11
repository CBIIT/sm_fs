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

    const pendingValues = control?.value;

    this.logger.debug(`Pending values: ${JSON.stringify(pendingValues)}`);

    const unfundedGrants = this.planManagementService.unfundedGrants();

    this.logger.debug(`Unfunded grants: ${JSON.stringify(unfundedGrants)}`);

    if (unfundedGrants?.includes(+this.applId) && !pendingValues) {
      return { grantUnfunded: true };
    }

    return null;
  }
}
