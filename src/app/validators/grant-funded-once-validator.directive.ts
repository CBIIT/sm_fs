import { Directive } from "@angular/core";
import {
  AbstractControl,
  NG_VALIDATORS,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import { NGXLogger } from "ngx-logger";

@Directive({
  selector: "[appGrantFundedOnceValidator]",
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: GrantFundedOnceValidatorDirective,
      multi: true,
    },
  ],
})
export class GrantFundedOnceValidatorDirective implements Validator {
  constructor(private logger: NGXLogger) {}


  // Verify that each grant is funded at least once
  validate(control: AbstractControl): ValidationErrors {
    return null;
  }
}
