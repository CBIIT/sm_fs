import {Directive} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn} from '@angular/forms';

@Directive({
  selector: '[appFundingSourceCostValidator]',
  providers: [{provide: NG_VALIDATORS, useExisting: FundingSourceCostValidatorDirective, multi: true}]
})
export class FundingSourceCostValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return fundingSourceCostValidator(control);
  }
}
// This is the actual function that does the validation. To use it in a template, we need to wrap it in a directive
// (see above). It could have been implemented inline above, but this form makes the validator function also
// usable by itself in a Reactive model.
export const fundingSourceCostValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const recommendedDirect = control.get('recommendedDirect');
  const recommendedTotal = control.get('recommendedTotal');


  if (!recommendedDirect || !recommendedTotal || isNaN(recommendedDirect.value) || isNaN(recommendedTotal.value)) {
    return null;
  }

  if (Number(recommendedTotal.value) < Number(recommendedDirect.value)) {
    return {totalCostLessThanDirectCost: true};
  }

  return null;
};
