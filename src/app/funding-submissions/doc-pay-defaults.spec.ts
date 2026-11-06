import { FundingSubmissionDocPayDefaultsDto } from '@cbiit/i2efsws-lib';

import {
  applyDocPayDefaults, DOC_PAY_SELECTION_FIELDS, DocPayFields, DocPayProvenance, DocPaySelections,
  hasIncompleteDocRecommendation, isBlankSelection, isPayDecision, requireDocPayDefaults
} from './doc-pay-defaults';

describe('FS-2679 DOC Pay selection reconciliation', () => {
  const defaults: FundingSubmissionDocPayDefaultsDto = {
    applId: 100, transitionEligible: true,
    budgetCategories: 'R01R37', docNciSelection: 'DOC', annualFundingR01: 'No', annualOrMyf: 'MYF Alloc',
    docPriority: '3', docRecAmt: 90000, docRecReductionPct: 10
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
    expect([0, '0', 'No', 'Yes', 'NCI', ['No']].some(value => isBlankSelection(value))).toBeFalse();
  });

  it('recognizes Pay from a lookup code or literal value without treating Do Not Pay as Pay', () => {
    const options = [{ id: 'PAY', text: 'Pay' }, { id: 'DNP', text: 'Do Not Pay' }];
    expect(isPayDecision('PAY', options)).toBeTrue();
    expect(isPayDecision(['PAY'], options)).toBeTrue();
    expect(isPayDecision('Pay', [])).toBeTrue();
    expect(isPayDecision('DNP', options)).toBeFalse();
    expect(isPayDecision('Do Not Pay', [])).toBeFalse();
  });

  it('fills priority and the complete recommendation pair without treating zero as blank', () => {
    const fields: DocPayFields = { docPriority: null, docRecAmt: null, docRecReductionPct: null };
    expect(applyDocPayDefaults(fields, { ...defaults, docRecAmt: 0, docRecReductionPct: 0 }, () => true)).toBeTrue();
    expect(fields).toEqual(jasmine.objectContaining({ docPriority: '3', docRecAmt: 0, docRecReductionPct: 0 }));
    expect(hasIncompleteDocRecommendation(fields)).toBeFalse();
  });

  for (const fields of [
    { docRecAmt: 0, docRecReductionPct: null },
    { docRecAmt: null, docRecReductionPct: 0 },
    { docRecAmt: 100, docRecReductionPct: null }
  ]) {
    it(`never combines a populated half with a preview for ${JSON.stringify(fields)}`, () => {
      const before = { ...fields };
      applyDocPayDefaults(fields, defaults, () => true);
      expect(fields).toEqual(jasmine.objectContaining(before));
      expect(hasIncompleteDocRecommendation(fields)).toBeTrue();
    });
  }

  it('keeps the whole recommendation blank when either half changed during the request', () => {
    const fields: DocPayFields = { docRecAmt: null, docRecReductionPct: null };
    applyDocPayDefaults(fields, defaults, field => field !== 'docRecAmt');
    expect(fields.docRecAmt).toBeNull();
    expect(fields.docRecReductionPct).toBeNull();
  });

  for (const field of ['docPriority', 'docRecAmt', 'docRecReductionPct'] as const) {
    it(`rejects a preview without ${field}`, () => {
      expect(() => requireDocPayDefaults([{ ...defaults, [field]: null }], 100)).toThrow();
    });
  }

  it('retains AUTO across repeated previews and switches to SUBMITTED only after a real priority edit', () => {
    const fields: DocPayFields = { docPriority: null };
    const provenance = new DocPayProvenance(fields);
    provenance.preparePreview(fields);
    const versions = provenance.snapshot();
    expect(applyDocPayDefaults(fields, defaults, field => provenance.mayApplyDefault(field, versions))).toBeTrue();
    provenance.markAutomaticPriorityApplied();
    provenance.preparePreview(fields);
    expect(provenance.intent(100)).toEqual({ applId: 100, priorityMode: 'AUTO', editedFields: [] });
    provenance.recordUserEdit('docPriority');
    fields.docPriority = null;
    expect(provenance.mayApplyDefault('docPriority', provenance.snapshot())).toBeFalse();
    expect(provenance.intent(100).priorityMode).toBe('SUBMITTED');
  });

  it('treats a pre-existing priority, including zero, as SUBMITTED', () => {
    expect(new DocPayProvenance({ docPriority: 0 }).intent(100).priorityMode).toBe('SUBMITTED');
    expect(new DocPayProvenance({ docPriority: '9' }).intent(100).priorityMode).toBe('SUBMITTED');
  });

  it('records a genuine edit followed by a clear and does not default it on a later preview', () => {
    const provenance = new DocPayProvenance({});
    const before = provenance.snapshot();
    provenance.recordUserEdit('annualFundingR01');
    provenance.recordUserEdit('annualFundingR01');
    expect(provenance.mayApplyDefault('annualFundingR01', before)).toBeFalse();
    expect(provenance.mayApplyDefault('annualFundingR01', provenance.snapshot())).toBeFalse();
    expect(provenance.intent(100).editedFields).toEqual(['annualFundingR01']);
  });

  it('rebases after an acknowledged save without carrying submitted edits into a later transition', () => {
    const provenance = new DocPayProvenance({});
    provenance.recordUserEdit('docRecAmt');
    provenance.recordUserEdit('annualFundingR01');
    const submitted = provenance.snapshot();
    provenance.recordUserEdit('docNciSelection');
    provenance.recordUserEdit('docPriority');
    const rebased = provenance.rebase({ docPriority: null }, submitted, false);
    expect(rebased.intent(100)).toEqual({
      applId: 100, priorityMode: 'SUBMITTED', editedFields: ['docNciSelection']
    });
    expect(rebased.mayApplyDefault('docRecAmt', rebased.snapshot())).toBeTrue();
    expect(rebased.mayApplyDefault('docNciSelection', rebased.snapshot())).toBeFalse();
  });

  it('retains submitted user edits after a conflicted or unknown outcome', () => {
    const provenance = new DocPayProvenance({});
    provenance.recordUserEdit('annualFundingR01');
    const submitted = provenance.snapshot();
    provenance.recordUserEdit('docRecAmt');
    const rebased = provenance.rebase({ docPriority: null }, submitted, true);
    expect(rebased.intent(100).editedFields).toEqual(['annualFundingR01', 'docRecAmt']);
  });

  it('does not turn a later programmatic calculation into a user edit when rebasing', () => {
    const provenance = new DocPayProvenance({});
    provenance.recordUserEdit('docRecReductionPct');
    const submitted = provenance.snapshot();
    provenance.recordChange('docRecReductionPct');
    const rebased = provenance.rebase({}, submitted, false);
    expect(rebased.intent(100).editedFields).toEqual([]);
  });
});
