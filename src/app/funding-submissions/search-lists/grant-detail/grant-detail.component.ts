import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { FundingSubmBulkEditFieldsDto, FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { NGXLogger } from 'ngx-logger';
import { Select2OptionData } from 'ng-select2';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';

import { DocumentsDto } from '@cbiit/i2efsws-lib/model/documentsDto';

@Component({
  selector: 'app-grant-detail',
  templateUrl: './grant-detail.component.html',
  styleUrls: ['./grant-detail.component.css']
})
export class GrantDetailComponent implements OnInit, OnChanges {
  @Input() data: any = null;
  @Input() listId: number;
  @Output() close = new EventEmitter<void>();
  // Emitted when edit mode ends without any row teardown (Cancel, either path) — distinct from
  // `close`, which remains reserved for actual row-collapse/teardown (chevron toggle). See
  // Prompt - Grant Detail Cancel Reverts to Read-Only.md for the fix this supports.
  @Output() editModeExited = new EventEmitter<void>();
  // Emitted after every successful save (funding-fields and/or justification-only), once
  // `this.data` has been fully mutated with the saved values — lets the parent
  // (search-lists.component.ts) redraw its DataTables row so the list reflects the change
  // immediately without a full page reload. Distinct from `close` (row teardown) and
  // `editModeExited` (Cancel-flow no-op in the parent). See
  // Prompt - Grant Detail Save Refresh (List and Own Display).md for the fix this supports.
  @Output() saved = new EventEmitter<void>();
  @ViewChild('cancelEditWarningModal') private cancelEditWarningModalRef: TemplateRef<any>;

  isEditMode = false;
  grantViewerUrl = '';
  // Guards onEdit() against pre-populating the form before the initial
  // refreshJustificationData() fetch (triggered by ngOnInit()/ngOnChanges()) has resolved —
  // otherwise the justification textarea could silently start blank/stale. Set true on both
  // the success and error branches so a failed fetch never permanently locks out Edit mode.
  justificationLoaded = false;

  formModel: FundingSubmBulkEditFieldsDto & { justificationText?: string } = {};
  justificationFile: File | null = null;
  justificationDocuments: DocumentsDto[] = [];
  justificationFileError: string | null = null;
  saveSuccessMessage = '';
  saveValidationError: string | null = null;
  private initialFormSnapshot = '';
  private initialFundingSnapshot = '';
  private cancelModalRef: NgbModalRef;
  private savingInProgress = false;
  private suppressNextLeavePrompt = false;

  // Client-side validation constants — mirror FsubJustificationConstants (sm_i2e_fs_ws)
  private readonly MAX_JUSTIFICATION_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, mirrors FsubJustificationConstants.MAX_FILE_SIZE_BYTES
  private readonly ALLOWED_JUSTIFICATION_FILE_EXTENSIONS = ['doc', 'docx', 'rtf', 'xls', 'xlsx', 'pdf']; // mirrors FsubJustificationConstants.ALLOWED_FILE_EXTENSIONS
  private readonly JUSTIFICATION_UPLOAD_GUIDANCE = 'You may upload Microsoft Word, Rich Text Format, Microsoft Excel, or Adobe Acrobat document(s) only. Max file size is 10MB';

  // Populated from the shared FundingSubmDropdownLookupService (2026-08-24 Individual/Bulk Edit
  // dropdown consistency fix) so this screen and Bulk Edit always use the same value lists.
  // Initialized empty and populated in ngOnInit(); see fetchDropdownOptions().
  decisionOptions: Select2OptionData[] = [];
  yesNoOptions: Select2OptionData[] = [];
  annualMyfOptions: Select2OptionData[] = [];
  budgetCategoryOptions: Select2OptionData[] = [];
  selectionOptions: Select2OptionData[] = [];

  constructor(
    private logger: NGXLogger,
    private fundingSubmissionsService: FundingSubmissionsControllerService,
    private propertiesService: AppPropertiesService,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal,
    private dropdownLookupService: FundingSubmDropdownLookupService
  ) {}

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.fetchDropdownOptions();
    this.refreshJustificationData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['listId'] || changes['data']) && this.listId && this.data?.applId) {
      this.justificationLoaded = false;
      this.refreshJustificationData();
    }
  }

  private fetchDropdownOptions(): void {
    this.dropdownLookupService.getDocDecisions().subscribe({
      next: options => { this.decisionOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load DOC Decision options', err)
    });
    this.dropdownLookupService.getAnnualFundingR01Options().subscribe({
      next: options => { this.yesNoOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load Two-Year Annual Funding R01 options', err)
    });
    this.dropdownLookupService.getAnnualOrMyfOptions().subscribe({
      next: options => { this.annualMyfOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load Annual or MYF options', err)
    });
    this.dropdownLookupService.getBudgetCategories().subscribe({
      next: options => { this.budgetCategoryOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load Budget Categories options', err)
    });
    this.dropdownLookupService.getDocNciSelections().subscribe({
      next: options => { this.selectionOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load DOC/NCI Selection options', err)
    });
  }


  onEdit(): void {
    // Guard against building formModel from stale/absent data while the initial
    // justification fetch is still in flight — the template also disables the Edit button
    // while !justificationLoaded, but this guard protects against any other trigger path.
    if (!this.justificationLoaded) {
      return;
    }
    this.formModel = {
      docDecision:        this.data?.docDecision ?? null,
      docPriority:        this.data?.docPriority ?? null,
      docRecAmt:          this.data?.docRecommendedAmount ?? null,
      docRecReductionPct: this.data?.docRecommendedReductionPct ?? null,
      docNciSelection:    this.data?.docNciSelection ?? null,
      annualFundingR01:   this.data ? (this.data.twoYearAnnualFundingR01Flag ? 'Yes' : 'No') : null,
      budgetCategories:   this.data?.budgetCategoryCode ?? null,
      docNotes:           this.data?.docNotes ?? '',
      oefiaNotes:         this.data?.oefiaNotes ?? '',
      annualOrMyf:        this.data?.annualOrMyf ?? null,
      justificationText:  this.data?.justificationText ?? '',
    };
    this.justificationFile = null;
    this.justificationFileError = null;
    this.saveSuccessMessage = '';
    this.saveValidationError = null;
    this.isEditMode = true;
    this.initialFormSnapshot = this.currentSnapshot();
    this.initialFundingSnapshot = this.currentFundingSnapshot();
    this.cdr.detectChanges();
  }

  onCancel(): void {
    if (!this.isEditMode) {
      return;
    }

    if (!this.hasUnsavedChanges()) {
      this.discardEditsAndClose();
      return;
    }

    this.cancelModalRef = this.modalService.open(this.cancelEditWarningModalRef, { centered: true });
  }

  onCancelWarningClose(): void {
    this.cancelModalRef?.dismiss();
  }

  onCancelWarningProceed(): void {
    this.cancelModalRef?.close();
    this.discardEditsAndClose();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.justificationFile = null;
      this.justificationFileError = null;
      this.cdr.detectChanges();
      return;
    }

    // Validate file extension (case-insensitive)
    const fileNameParts = file.name.split('.');
    const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop()!.toLowerCase() : '';
    if (!this.ALLOWED_JUSTIFICATION_FILE_EXTENSIONS.includes(fileExtension)) {
      this.justificationFileError = 'Unsupported file type. Allowed types: Word, RTF, Excel, PDF.';
      this.justificationFile = null;
      input.value = ''; // Clear input so same file can be re-selected/detected
      this.cdr.detectChanges();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_JUSTIFICATION_FILE_SIZE_BYTES) {
      this.justificationFileError = 'File exceeds the 10 MB size limit.';
      this.justificationFile = null;
      input.value = ''; // Clear input so same file can be re-selected/detected
      this.cdr.detectChanges();
      return;
    }

    // Valid file
    this.justificationFileError = null;
    this.justificationFile = file;
    this.cdr.detectChanges();
  }

  onSave(): void {
    this.suppressNextLeavePrompt = true;
    this.saveValidationError = this.validateChangedValues();
    if (this.saveValidationError) {
      this.cdr.detectChanges();
      return;
    }

    this.savingInProgress = true;
    this.logger.debug('GrantDetailComponent onSave()', this.formModel, 'listId:', this.listId);
    const { justificationText, ...fields } = this.formModel;
    const hasFundingFieldChanges = this.currentFundingSnapshot() !== this.initialFundingSnapshot;
    const hasJustificationChanges = !!this.justificationFile || !!justificationText;

    if (!hasFundingFieldChanges && !hasJustificationChanges) {
      this.savingInProgress = false;
      this.isEditMode = false;
      this.initialFormSnapshot = '';
      this.initialFundingSnapshot = '';
      this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
      this.saved.emit();
      this.cdr.detectChanges();
      return;
    }

    if (!hasFundingFieldChanges && hasJustificationChanges) {
      this.saveJustification(justificationText);
      return;
    }

    this.fundingSubmissionsService.bulkUpdateListGrants(
      { applIds: [this.data.applId], fields: fields as FundingSubmBulkEditFieldsDto },
      this.listId
    ).subscribe({
      next: () => {
        this.logger.debug('Grant detail saved');
        this.applyFormModelToData();
        if (justificationText || this.justificationFile) {
          this.saveJustification(justificationText);
        } else {
          this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
          this.isEditMode = false;
          this.initialFormSnapshot = '';
          this.savingInProgress = false;
          this.saved.emit();
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.savingInProgress = false;
        this.logger.error('Grant detail save error', err);
      }
    });
  }

  private validateChangedValues(): string | null {
    const pct = this.formModel.docRecReductionPct;
    if (pct != null && (pct < 0 || pct > 100)) {
      return 'DOC Rec % Red must be between 0 and 100.';
    }

    if (pct != null && !this.hasAtMostTwoDecimals(Number(pct))) {
      return 'DOC Rec % Red must be a valid percentage with up to 2 decimal places.';
    }

    const amt = this.formModel.docRecAmt;
    if (amt != null && amt < 0) {
      return 'DOC Rec $ cannot be negative.';
    }

    if (amt != null && !this.hasAtMostTwoDecimals(Number(amt))) {
      return 'DOC Rec $ must be a valid dollar amount with up to 2 decimal places.';
    }

    const priority = this.formModel.docPriority as any;
    if (priority != null && priority !== '' && (!Number.isInteger(Number(priority)) || Number(priority) < 0)) {
      return 'DOC Priority must be a non-negative whole number.';
    }

    return null;
  }

  private hasAtMostTwoDecimals(value: number): boolean {
    if (!Number.isFinite(value)) {
      return false;
    }
    return Math.round(value * 100) === value * 100;
  }

  private saveJustification(justificationText?: string): void {
    const normalizedJustificationText = justificationText && justificationText.length > 0
      ? justificationText
      : undefined;

    this.fundingSubmissionsService.saveJustificationForm(
      this.listId, this.data.applId, this.justificationFile ?? undefined, normalizedJustificationText
    ).subscribe({
      next: () => {
        this.data.justificationText = normalizedJustificationText ?? '';
        this.refreshJustificationData(() => {
          this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
          this.isEditMode = false;
          this.initialFormSnapshot = '';
          this.initialFundingSnapshot = '';
          this.savingInProgress = false;
          this.justificationFile = null;
          this.justificationFileError = null;
          this.saved.emit();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.savingInProgress = false;
        this.logger.error('Justification save error', err);
      }
    });
  }

  isSaveInProgress(): boolean {
    return this.savingInProgress;
  }

  onNotesModelChange(): void {
    this.cdr.detectChanges();
  }

  get justificationDocumentNames(): string {
    const namesFromDocuments = this.justificationDocuments
      .map((doc: any) => doc?.docFilename || doc?.doc || doc?.docDescription)
      .filter((name): name is string => !!name)
      .join(', ');

    if (namesFromDocuments) {
      return namesFromDocuments;
    }

    const fallbackRowName = this.data?.justificationFileName
      || this.data?.justificationFilename
      || this.data?.docFilename
      || this.data?.doc;
    return fallbackRowName || '';
  }

  get justificationUploadLabelText(): string {
    if (this.justificationFile?.name) {
      return this.justificationFile.name;
    }
    if (this.justificationDocumentNames) {
      return `Current file(s): ${this.justificationDocumentNames}`;
    }
    return this.JUSTIFICATION_UPLOAD_GUIDANCE;
  }

  consumeSuppressNextLeavePrompt(): boolean {
    const suppress = this.suppressNextLeavePrompt;
    this.suppressNextLeavePrompt = false;
    return suppress;
  }

  hasUnsavedChanges(): boolean {
    if (!this.isEditMode) {
      return false;
    }
    return this.currentSnapshot() !== this.initialFormSnapshot || !!this.justificationFile;
  }

  forceDiscardAndClose(): void {
    this.discardEditsAndClose();
  }

  private discardEditsAndClose(): void {
    this.isEditMode = false;
    this.formModel = {};
    this.justificationFile = null;
    this.justificationFileError = null;
    this.saveSuccessMessage = '';
    this.saveValidationError = null;
    this.initialFormSnapshot = '';
    this.initialFundingSnapshot = '';
    this.savingInProgress = false;
    // Cancel (either path — no-unsaved-changes fast path via onCancel(), or confirmed-discard
    // via onCancelWarningProceed()) reverts to read-only and stays open, mirroring how Save
    // reverts to read-only (isEditMode = false + detectChanges(), no output emitted at all).
    // `close` is reserved for actual row-collapse/teardown; this signals edit-mode-only exit.
    this.editModeExited.emit();
    this.cdr.detectChanges();
  }

  private currentSnapshot(): string {
    return JSON.stringify({
      docDecision: this.formModel.docDecision ?? null,
      docPriority: this.formModel.docPriority ?? null,
      docRecAmt: this.formModel.docRecAmt ?? null,
      docRecReductionPct: this.formModel.docRecReductionPct ?? null,
      docNciSelection: this.formModel.docNciSelection ?? null,
      annualFundingR01: this.formModel.annualFundingR01 ?? null,
      budgetCategories: this.formModel.budgetCategories ?? null,
      docNotes: this.formModel.docNotes ?? '',
      oefiaNotes: this.formModel.oefiaNotes ?? '',
      annualOrMyf: this.formModel.annualOrMyf ?? null,
      justificationText: this.formModel.justificationText ?? ''
    });
  }

  private currentFundingSnapshot(): string {
    return JSON.stringify({
      docDecision: this.formModel.docDecision ?? null,
      docPriority: this.formModel.docPriority ?? null,
      docRecAmt: this.formModel.docRecAmt ?? null,
      docRecReductionPct: this.formModel.docRecReductionPct ?? null,
      docNciSelection: this.formModel.docNciSelection ?? null,
      annualFundingR01: this.formModel.annualFundingR01 ?? null,
      budgetCategories: this.formModel.budgetCategories ?? null,
      docNotes: this.formModel.docNotes ?? '',
      oefiaNotes: this.formModel.oefiaNotes ?? '',
      annualOrMyf: this.formModel.annualOrMyf ?? null
    });
  }

  private applyFormModelToData(): void {
    this.data.docDecision                 = this.formModel.docDecision;
    this.data.docPriority                 = this.formModel.docPriority;
    this.data.docRecommendedAmount        = this.formModel.docRecAmt;
    this.data.docRecommendedReductionPct  = this.formModel.docRecReductionPct;
    this.data.docNciSelection             = this.formModel.docNciSelection;
    // R01 refresh fix (2026-08-25): twoYearAnnualFundingR01Flag started life as a boolean;
    // formModel.annualFundingR01 is the Yes/No string the dropdown renders. Writing the raw
    // string back left a truthy value for 'No' (the main grid renders `data ? 'Y' : ''`),
    // showing 'Y' regardless of the selected value. Coerce to a real boolean here.
    this.data.twoYearAnnualFundingR01Flag = this.formModel.annualFundingR01 === 'Yes';
    // budgetCategoryCode fix (2026-08-25): formModel.budgetCategories now holds the grant's
    // budget category CODE (seeded in onEdit() from this.data.budgetCategoryCode, matching the
    // CODE-keyed budgetCategoryOptions Select2), not the NAME the main grid displays. Sync
    // budgetCategoryCode (not the NAME-valued budgetCategories) so a subsequent re-onEdit() on
    // this same in-memory row still seeds the dropdown correctly without a full page reload.
    this.data.budgetCategoryCode          = this.formModel.budgetCategories;
    // Refresh fix (2026-08-25): budgetCategories (NAME) is what Grant Detail's own read-only
    // view AND the parent grid's column actually render — this was never written back, so both
    // stayed stale after a Budget Categories edit. Resolve the NAME from the CODE by looking up
    // the selected CODE against budgetCategoryOptions ({id, text} = {CODE, NAME}). If the
    // selection is empty/cleared or no match is found (e.g. options not yet loaded — see
    // Assumptions to Verify in the fix prompt), fall back to null rather than throwing.
    const selectedBudgetCategoryOption = this.budgetCategoryOptions.find(
      option => option.id === this.formModel.budgetCategories
    );
    this.data.budgetCategories             = selectedBudgetCategoryOption?.text ?? null;
    this.data.docNotes                    = this.formModel.docNotes;
    this.data.oefiaNotes                  = this.formModel.oefiaNotes;
    this.data.annualOrMyf                 = this.formModel.annualOrMyf;
  }

  private refreshJustificationData(onComplete?: () => void): void {
    if (!this.listId || !this.data?.applId) {
      this.justificationLoaded = true;
      onComplete?.();
      return;
    }

    this.fundingSubmissionsService.getJustification(this.listId, this.data.applId).subscribe({
      next: (justification) => {
        const rawDocuments = (justification as any)?.documents
          ?? (justification as any)?.document
          ?? (justification as any)?.docs
          ?? [];
        this.justificationDocuments = Array.isArray(rawDocuments)
          ? rawDocuments
          : (rawDocuments ? [rawDocuments] : []);
        if (justification?.justificationText != null) {
          this.data.justificationText = justification.justificationText;
        }
        this.justificationLoaded = true;
        this.cdr.detectChanges();
        onComplete?.();
      },
      error: (err) => {
        this.logger.debug('Unable to load justification documents', err);
        // Still flip the flag on error so a failed fetch never permanently disables Edit.
        this.justificationLoaded = true;
        this.cdr.detectChanges();
        onComplete?.();
      }
    });
  }

}
