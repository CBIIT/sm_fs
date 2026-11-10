import {
  FundingSubmBulkEditFieldsDto,
  FundingSubmissionDocPayDefaultsDto,
  FundingSubmissionTransitionIntentDto
} from '@cbiit/i2efsws-lib';
import { Select2OptionData } from 'ng-select2';

export const DOC_PAY_SELECTION_FIELDS = [
  'budgetCategories', 'docNciSelection', 'annualFundingR01', 'annualOrMyf'
] as const;

export type DocPaySelectionField = typeof DOC_PAY_SELECTION_FIELDS[number];
export type DocPaySelections = Pick<FundingSubmBulkEditFieldsDto, DocPaySelectionField>;
export type DocPayEditedField = DocPaySelectionField | 'docRecAmt' | 'docRecReductionPct';
export type DocPayDefaultField = DocPayEditedField | 'docPriority';

export interface DocPayFields extends DocPaySelections {
  docPriority?: string | number | null;
  docRecAmt?: number | null;
  docRecReductionPct?: number | null;
}

export class DocPayProvenance {
  private readonly versions = new Map<string, number>();
  private readonly userEditVersions = new Map<string, number>();
  private readonly editedFields = new Set<DocPayEditedField>();
  private automaticPriorityApplied = false;
  private priorityMode: FundingSubmissionTransitionIntentDto.PriorityModeEnum;

  constructor(fields: DocPayFields) {
    this.priorityMode = isBlankSelection(fields.docPriority) ? 'AUTO' : 'SUBMITTED';
  }

  preparePreview(fields: DocPayFields): void {
    if (!this.automaticPriorityApplied && !isBlankSelection(fields.docPriority)) {
      this.priorityMode = 'SUBMITTED';
    }
  }

  recordUserEdit(field: string): void {
    const version = this.recordChange(field);
    this.userEditVersions.set(field, version);
    if (field === 'docPriority') {
      this.priorityMode = 'SUBMITTED';
    } else if (DOC_PAY_SELECTION_FIELDS.includes(field as DocPaySelectionField)
      || field === 'docRecAmt' || field === 'docRecReductionPct') {
      this.editedFields.add(field as DocPayEditedField);
    }
  }

  recordChange(field: string): number {
    const version = (this.versions.get(field) ?? 0) + 1;
    this.versions.set(field, version);
    return version;
  }

  snapshot(): Map<string, number> {
    return new Map(this.versions);
  }

  unchangedSince(field: string, snapshot: Map<string, number>): boolean {
    return (this.versions.get(field) ?? 0) === (snapshot.get(field) ?? 0);
  }

  hasUserEdit(field: string): boolean {
    return this.userEditVersions.has(field);
  }

  mayApplyDefault(field: DocPayDefaultField, snapshot: Map<string, number>): boolean {
    if (!this.unchangedSince(field, snapshot)) {
      return false;
    }
    return field === 'docPriority'
      ? this.priorityMode === 'AUTO'
      : !this.editedFields.has(field);
  }

  markAutomaticPriorityApplied(): void {
    this.automaticPriorityApplied = true;
  }

  rebase(fields: DocPayFields, submitted: Map<string, number>, keepSubmittedEdits: boolean): DocPayProvenance {
    const rebased = new DocPayProvenance(fields);
    for (const [field, version] of this.versions) {
      const submittedVersion = submitted.get(field) ?? 0;
      if (!keepSubmittedEdits && version === submittedVersion) continue;
      const userEditVersion = this.userEditVersions.get(field) ?? 0;
      if (userEditVersion > (keepSubmittedEdits ? 0 : submittedVersion)) {
        rebased.recordUserEdit(field);
      } else {
        rebased.recordChange(field);
      }
    }
    return rebased;
  }

  intent(applId: number): FundingSubmissionTransitionIntentDto {
    return { applId, priorityMode: this.priorityMode, editedFields: [...this.editedFields] };
  }
}

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
    || isBlankSelection(grantDefaults.annualOrMyf)
    || isBlankSelection(grantDefaults.docPriority)
    || isBlankSelection(grantDefaults.docRecAmt)
    || isBlankSelection(grantDefaults.docRecReductionPct)) {
    throw new Error('The DOC Pay defaults could not be resolved. Refresh the list and try again.');
  }
  return grantDefaults;
}

export function applyDocPayDefaults(
  fields: DocPayFields,
  defaults: FundingSubmissionDocPayDefaultsDto,
  unchanged: (field: DocPayDefaultField) => boolean
): boolean {
  for (const field of DOC_PAY_SELECTION_FIELDS) {
    if (unchanged(field) && isBlankSelection(fields[field]) && !isBlankSelection(defaults[field])) {
      fields[field] = defaults[field];
    }
  }

  let appliedPriority = false;
  if (unchanged('docPriority') && isBlankSelection(fields.docPriority) && !isBlankSelection(defaults.docPriority)) {
    fields.docPriority = defaults.docPriority;
    appliedPriority = true;
  }

  if (isBlankSelection(fields.docRecAmt) && isBlankSelection(fields.docRecReductionPct)
    && unchanged('docRecAmt') && unchanged('docRecReductionPct')
    && !isBlankSelection(defaults.docRecAmt) && !isBlankSelection(defaults.docRecReductionPct)) {
    fields.docRecAmt = defaults.docRecAmt;
    fields.docRecReductionPct = defaults.docRecReductionPct;
  }
  return appliedPriority;
}

export function hasIncompleteDocRecommendation(fields: DocPayFields): boolean {
  return isBlankSelection(fields.docRecAmt) !== isBlankSelection(fields.docRecReductionPct);
}

export type DocRecommendationField = 'docRecAmt' | 'docRecReductionPct' | 'docPriority';

export function validateDocRecommendation(
  values: Pick<DocPayFields, DocRecommendationField>,
  options: { isRequired: (field: DocRecommendationField) => boolean }
): Partial<Record<DocRecommendationField, string>> {
  const errors: Partial<Record<DocRecommendationField, string>> = {};
  const requiredFields = {
    docRecReductionPct: 'DOC Rec % Red',
    docRecAmt: 'DOC Rec $',
    docPriority: 'DOC Priority'
  };
  for (const field of Object.keys(requiredFields) as DocRecommendationField[]) {
    const value = values[field];
    if ((value == null || String(value).trim() === '') && options.isRequired(field)) {
      errors[field] = `${requiredFields[field]} is required`;
    }
  }

  const pct = values.docRecReductionPct;
  const numericPct = toFiniteNumberOrNull(pct);
  if (!errors.docRecReductionPct && pct != null && String(pct).trim() !== '' && !isValidReductionPctForCalculation(numericPct)) {
    errors.docRecReductionPct = 'Enter a numeric value between 0 and 99.99, with at most 2 decimal places.';
  }

  const amt = values.docRecAmt;
  if (amt != null && amt < 0) {
    errors.docRecAmt = 'DOC Rec $ cannot be negative.';
  }
  if (!errors.docRecAmt && amt != null && String(amt).trim() !== '' && !isWholeDollarAmount(amt)) {
    errors.docRecAmt = 'DOC Rec $ must be a whole dollar amount.';
  }

  const priority = values.docPriority;
  if (priority != null && priority !== '' && (!Number.isInteger(Number(priority)) || Number(priority) < 0)) {
    errors.docPriority = 'DOC Priority must be a non-negative whole number.';
  }
  return errors;
}

export function isWholeDollarAmount(value: unknown): boolean {
  const parsed = parseExactDecimal(value);
  return parsed != null && parsed.coefficient % (10n ** BigInt(parsed.scale)) === 0n;
}

export function hasAtMostTwoDecimals(value: unknown): boolean {
  const parsed = parseExactDecimal(value);
  return parsed != null && parsed.scale <= 2;
}

export function toFiniteNumberOrNull(value: any): number | null {
  if (value == null || value === '') {
    return null;
  }

  // Accept formatted user/backend values like "$100,000.50" or "10%".
  const normalizedValue = typeof value === 'string'
    ? value.replace(/[$,%\s]/g, '').replace(/,/g, '')
    : value;

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function parseExactDecimal(value: unknown): { coefficient: bigint; scale: number } | null {
  if (value == null || value === '') {
    return null;
  }

  const normalizedValue = String(value).replace(/[$,%\s,]/g, '');
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(normalizedValue);
  if (!match || (!match[2] && !match[3])) {
    return null;
  }

  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) {
    return null;
  }
  const fraction = match[3] ?? '';
  const digits = `${match[2] || '0'}${fraction}`;
  let coefficient = BigInt(`${match[1] === '-' ? '-' : ''}${digits}`);
  let scale = fraction.length - exponent;
  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { coefficient, scale };
}

export function isValidReductionPctForCalculation(value: number | null): boolean {
  return value != null && value >= 0 && value < 100 && hasAtMostTwoDecimals(value);
}
