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

export const fundingSourceCostValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const recommendedDirect = control.get('recommendedDirect');
  const recommendedTotal = control.get('recommendedTotal');


  if (!recommendedDirect || !recommendedTotal || isNaN(recommendedDirect.value) || isNaN(recommendedTotal.value)) {
    return null;
  }
  console.log('recommendedDirect:', recommendedDirect.value);
  console.log('recommendedTotal:', recommendedTotal.value);

  if (Number(recommendedTotal.value) < Number(recommendedDirect.value)) {
    return {totalCostLessThanDirectCost: true};
  }

  return null;
};
