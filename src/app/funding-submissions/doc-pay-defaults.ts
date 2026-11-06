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
