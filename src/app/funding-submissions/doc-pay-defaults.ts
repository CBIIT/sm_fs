import { FundingSubmBulkEditFieldsDto, FundingSubmissionDocPayDefaultsDto } from '@cbiit/i2efsws-lib';
import { Select2OptionData } from 'ng-select2';

export const DOC_PAY_SELECTION_FIELDS = [
  'budgetCategories', 'docNciSelection', 'annualFundingR01', 'annualOrMyf'
] as const;

export type DocPaySelectionField = typeof DOC_PAY_SELECTION_FIELDS[number];
export type DocPaySelections = Pick<FundingSubmBulkEditFieldsDto, DocPaySelectionField>;

export function isBlankSelection(value: unknown): boolean {
  const selection = Array.isArray(value) ? value[0] : value;
  return selection == null || String(selection).trim() === '';
}

export function isPayDecision(value: unknown, options: Select2OptionData[]): boolean {
  const selection = Array.isArray(value) ? value[0] : value;
  const option = options.find(item => String(item.id) === String(selection));
  return String(option?.text ?? selection ?? '').trim().toLowerCase() === 'pay';
}

export function requireDocPayDefaults(
  defaults: FundingSubmissionDocPayDefaultsDto[], applId: number
): FundingSubmissionDocPayDefaultsDto {
  const grantDefaults = defaults?.find(row => row.applId === applId);
  if (!grantDefaults?.transitionEligible) {
    throw new Error('The grant status has changed. Refresh the list before editing.');
  }
  if (isBlankSelection(grantDefaults.budgetCategories)
    || isBlankSelection(grantDefaults.docNciSelection)
    || isBlankSelection(grantDefaults.annualOrMyf)) {
    throw new Error('The DOC Pay defaults could not be resolved. Refresh the list and try again.');
  }
  return grantDefaults;
}

export function applyDocPayDefaults(
  fields: DocPaySelections,
  defaults: FundingSubmissionDocPayDefaultsDto,
  unchanged: (field: DocPaySelectionField) => boolean
): void {
  for (const field of DOC_PAY_SELECTION_FIELDS) {
    if (unchanged(field) && isBlankSelection(fields[field]) && !isBlankSelection(defaults[field])) {
      fields[field] = defaults[field];
    }
  }
}
