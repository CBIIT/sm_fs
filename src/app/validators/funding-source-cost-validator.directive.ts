import {Directive} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn} from '@angular/forms';
import { isNumeric } from '../utils/utils';

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

  let recommendedDirectVal = recommendedDirect?.value?.replace(/\,/g, '');
  let recommendedTotalVal = recommendedTotal?.value?.replace(/\,/g, '');

  if (!recommendedDirect || !recommendedTotal || !isNumeric(recommendedDirectVal) || !isNumeric(recommendedTotalVal)) {
    return null;
  }

  if (Number(recommendedTotalVal) < Number(recommendedDirectVal)) {
    return {totalCostLessThanDirectCost: true};
  }

  return null;
};
