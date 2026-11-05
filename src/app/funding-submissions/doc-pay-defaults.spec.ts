import { FundingSubmissionDocPayDefaultsDto } from '@cbiit/i2efsws-lib';

import { applyDocPayDefaults, DOC_PAY_SELECTION_FIELDS, DocPaySelections, isBlankSelection, isPayDecision, requireDocPayDefaults } from './doc-pay-defaults';

describe('FS-2679 DOC Pay selection reconciliation', () => {
  const defaults: FundingSubmissionDocPayDefaultsDto = {
    applId: 100, transitionEligible: true,
    budgetCategories: 'R01R37', docNciSelection: 'DOC', annualFundingR01: 'No', annualOrMyf: 'MYF Alloc'
  };

  for (const field of DOC_PAY_SELECTION_FIELDS) {
    it(`restores a missing ${field} and preserves all other populated selections`, () => {
      const fields: DocPaySelections = {
        budgetCategories: 'EXPLICIT', docNciSelection: 'NCI', annualFundingR01: 'Yes', annualOrMyf: 'AF Alloc'
      };
      fields[field] = ' ';
      const before = { ...fields };
      applyDocPayDefaults(fields, defaults, () => true);
      expect(fields[field]).toBe(defaults[field]);
      for (const other of DOC_PAY_SELECTION_FIELDS.filter(key => key !== field)) {
        expect(fields[other]).toBe(before[other]);
      }
    });

    it(`does not replace a newer blank ${field}`, () => {
      const fields: DocPaySelections = { [field]: null };
      applyDocPayDefaults(fields, defaults, () => false);
      expect(fields[field]).toBeNull();
    });
  }

  it('retains a blank 2Y response rather than inventing a non-R01 default', () => {
    const fields: DocPaySelections = { annualFundingR01: null };
    applyDocPayDefaults(fields, { ...defaults, annualFundingR01: null }, () => true);
    expect(fields.annualFundingR01).toBeNull();
  });

  it('reconciles the matching application ID rather than the first returned row', () => {
    expect(requireDocPayDefaults([{ ...defaults, applId: 200, budgetCategories: 'OTHER' }, defaults], 100)).toBe(defaults);
  });

  it('accepts an eligible non-R01 response with all mandatory lookup codes and no 2Y default', () => {
    const nonR01 = { ...defaults, annualFundingR01: null };
    expect(requireDocPayDefaults([nonR01], 100)).toBe(nonR01);
  });

  it('recognizes only blank selections, including Select2 array values', () => {
    expect([null, undefined, '', ' ', [], [' ']].every(value => isBlankSelection(value))).toBeTrue();
    expect(['No', 'Yes', 'NCI', ['No']].some(value => isBlankSelection(value))).toBeFalse();
  });

  it('recognizes Pay from a lookup code or literal value without treating Do Not Pay as Pay', () => {
    const options = [{ id: 'PAY', text: 'Pay' }, { id: 'DNP', text: 'Do Not Pay' }];
    expect(isPayDecision('PAY', options)).toBeTrue();
    expect(isPayDecision(['PAY'], options)).toBeTrue();
    expect(isPayDecision('Pay', [])).toBeTrue();
    expect(isPayDecision('DNP', options)).toBeFalse();
    expect(isPayDecision('Do Not Pay', [])).toBeFalse();
  });
});
