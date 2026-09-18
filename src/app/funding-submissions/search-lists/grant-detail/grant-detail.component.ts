import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { FundingSubmBulkEditFieldsDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { NGXLogger } from 'ngx-logger';
import { roleNames } from '../../../service/role-names';
import { Select2OptionData } from 'ng-select2';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { saveAs } from 'file-saver';
import { catchError, concatMap, from, map, Observable, tap } from 'rxjs';

import { DocumentsDto } from '@cbiit/i2efsws-lib/model/documentsDto';
import { DocumentService } from '../../../service/document.service';

@Component({
  selector: 'app-grant-detail',
  templateUrl: './grant-detail.component.html',
  styleUrls: ['./grant-detail.component.css']
})
export class GrantDetailComponent implements OnInit, OnChanges {
  @Input() data: any = null;
  @Input() listId: number;
  @Input() listStatus = 'DOC Review';
  @Output() close = new EventEmitter<void>();
  // Emitted when edit mode ends without any row teardown (Cancel, either path) — distinct from
  // `close`, which remains reserved for actual row-collapse/teardown (chevron toggle).
  @Output() editModeExited = new EventEmitter<void>();
  // Emitted after every successful save (funding-fields and/or justification-only), once
  // `this.data` has been fully mutated with the saved values — lets the parent
  // (search-lists.component.ts) redraw its DataTables row so the list reflects the change
  // immediately without a full page reload. Distinct from `close` (row teardown) and
  // `editModeExited` (Cancel-flow no-op in the parent).
  @Output() saved = new EventEmitter<void>();
  @ViewChild('cancelEditWarningModal') private cancelEditWarningModalRef: TemplateRef<any>;

  isEditMode = false;
  grantViewerUrl = '';
  // Guards onEdit() against pre-populating the form before the initial
  // refreshJustificationData() fetch (triggered by ngOnInit()/ngOnChanges()) has resolved —
  // otherwise the justification textarea could silently start blank/stale. Set true on both
  // the success and error branches so a failed fetch never permanently locks out Edit mode.
  justificationLoaded = false;
  // Guards onEdit() against pre-populating (and, downstream, onSave() against writing back) the
  // Budget Categories field before the initial getBudgetCategories() fetch (triggered by
  // fetchDropdownOptions(), from ngOnInit()) has resolved — otherwise applyFormModelToData()'s
  // CODE->NAME .find() against budgetCategoryOptions can silently resolve to null (fallback
  // already in place for a genuinely-unmatched code) purely due to load timing. Set true on both
  // the success and error branches so a failed fetch never permanently locks out Edit mode — same
  // rationale as justificationLoaded. Unlike justificationLoaded, this is NOT reset in
  // ngOnChanges(): budgetCategoryOptions is a grant-independent lookup table fetched once per
  // session (shareReplay(1) in FundingSubmDropdownLookupService), never re-fetched on a row
  // switch, so resetting this flag would permanently re-disable Edit after the first row. See
  // Prompt - Grant Detail Edit Button Budget Categories Race Condition.md.
  budgetCategoriesLoaded = false;

  formModel: FundingSubmBulkEditFieldsDto & { justificationText?: string } = {};
  justificationFiles: File[] = [];
  justificationDocuments: DocumentsDto[] = [];
  stagedDeleteDocumentIds: number[] = [];
  justificationFileError: string | null = null;
  justificationSaveError: string | null = null;
  saveSuccessMessage = '';
  docFundingListCor = false;
  OEFIACertifier = false;
  doNotPayOefiaLockActive = false;
  saveValidationError: string | null = null;
  saveValidationErrors: Record<string, string> = {};
  private initialFormSnapshot = '';
  private initialFundingSnapshot = '';
  private initialJustificationText = '';
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
    private userSessionService: AppUserSessionService,
    private fundingSubmissionsService: FundingSubmissionsService,
    private propertiesService: AppPropertiesService,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal,
    private dropdownLookupService: FundingSubmDropdownLookupService,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.docFundingListCor = this.userSessionService.hasRole(roleNames.DOC_FUNDING_LIST_COR);
    this.OEFIACertifier = this.userSessionService.hasRole(roleNames.OEFIA_CERTIFIER);
    this.fetchDropdownOptions();
    this.refreshJustificationData().subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['listId'] || changes['data']) && this.listId && this.data?.applId) {
      this.justificationLoaded = false;
      this.refreshJustificationData().subscribe();
    }

    this.recomputeDoNotPayOefiaLock();
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
      next: options => {
        this.budgetCategoryOptions = options;
        this.budgetCategoriesLoaded = true;
        this.cdr.detectChanges();
      },
      error: err => {
        this.logger.error('Failed to load Budget Categories options', err);
        // Still flip the flag on error so a failed fetch never permanently disables Edit.
        this.budgetCategoriesLoaded = true;
        this.cdr.detectChanges();
      }
    });
    this.dropdownLookupService.getDocNciSelections().subscribe({
      next: options => { this.selectionOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load DOC/NCI Selection options', err)
    });
  }

  /**
   * Display CODE vs NAME Reconciliation (2026-08-25): resolves a raw docDecision CODE to its
   * human-readable NAME using the same decisionOptions already fetched for the edit-mode
   * Select2 dropdown, falling back to the raw code if no match is found so an unrecognized
   * value never throws or renders blank.
   */
  getDocDecisionDisplay(code: string): string {
    if (!code) {
      return '';
    }
    const match = this.decisionOptions.find(option => option.id === code);
    return match ? match.text : code;
  }


  onEdit(): void {
    // Guard against building formModel from stale/absent data while the initial
    // justification fetch is still in flight — the template also disables the Edit button
    // while !justificationLoaded, but this guard protects against any other trigger path.
    if (!this.justificationLoaded || !this.budgetCategoriesLoaded) {
      return;
    }
    this.formModel = {
      docDecision:        this.data?.docDecision ?? null,
      docPriority:        this.data?.docPriority ?? null,
      docRecAmt:          this.data?.docRecommendedAmount ?? null,
      docRecReductionPct: this.data?.docRecommendedReductionPct ?? null,
      docNciSelection:    this.data?.docNciSelection ?? null,
      annualFundingR01:   this.data?.twoYearAnnualFundingR01Flag ? 'Yes' : null,
      budgetCategories:   this.data?.budgetCategoryCode ?? null,
      docNotes:           this.data?.docNotes ?? '',
      oefiaNotes:         this.data?.oefiaNotes ?? '',
      annualOrMyf:        this.data?.annualOrMyf ?? null,
      justificationText:  this.data?.justificationText ?? '',
    };
    this.justificationFiles = [];
    this.justificationFileError = null;
    this.justificationSaveError = null;
    this.stagedDeleteDocumentIds = [];
    this.saveSuccessMessage = '';
    this.clearValidationErrors();
    this.isEditMode = true;
    this.initialFormSnapshot = this.currentSnapshot();
    this.initialFundingSnapshot = this.currentFundingSnapshot();
    this.initialJustificationText = this.formModel.justificationText ?? '';
    this.recomputeDoNotPayOefiaLock();
    this.cdr.detectChanges();
  }

  onDocDecisionChange(): void {
    this.recomputeDoNotPayOefiaLock();
    this.updateValidationErrorsLive();
    this.cdr.detectChanges();
  }

  onValidationFieldChange(): void {
    this.updateValidationErrorsLive();
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
    this.justificationSaveError = null;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.justificationFileError = null;
      this.cdr.detectChanges();
      return;
    }

    if (this.visibleAttachedFileCount >= 3) {
      this.justificationFileError = 'A maximum of 3 justification files is allowed per grant.';
      input.value = '';
      this.cdr.detectChanges();
      return;
    }

    // Validate file extension (case-insensitive)
    const fileNameParts = file.name.split('.');
    const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop()!.toLowerCase() : '';
    if (!this.ALLOWED_JUSTIFICATION_FILE_EXTENSIONS.includes(fileExtension)) {
      this.justificationFileError = 'Unsupported file type. Allowed types: Word, RTF, Excel, PDF.';
      input.value = ''; // Clear input so same file can be re-selected/detected
      this.cdr.detectChanges();
      return;
    }

    // Validate file size
    if (file.size > this.MAX_JUSTIFICATION_FILE_SIZE_BYTES) {
      this.justificationFileError = 'The size of the file you are attaching exceeds 10 MBs maximum file limit.';
      input.value = ''; // Clear input so same file can be re-selected/detected
      this.cdr.detectChanges();
      return;
    }

    // Valid file
    this.justificationFileError = null;
    this.justificationFiles = [...this.justificationFiles, file];
    input.value = '';
    this.cdr.detectChanges();
  }

  onSave(): void {
    this.suppressNextLeavePrompt = true;
    this.justificationSaveError = null;

    // For DOC users this field is view-only; ignore any client-side model tampering.
    // OEFIA users can edit this field and their change must be preserved.
    if (this.docFundingListCor && !this.OEFIACertifier) {
      this.formModel.oefiaNotes = this.data?.oefiaNotes ?? '';
    }

    // Business rule: when DOC Decision is Do Not Pay, dependent funding and
    // justification fields are discarded before validation/persistence.
    if (this.isDoNotPayDecisionSelected()) {
      this.clearDoNotPayDependentFields();
    }

    this.saveValidationErrors = this.validateChangedValues();
    this.saveValidationError = this.getFirstValidationError(this.saveValidationErrors);
    if (Object.keys(this.saveValidationErrors).length > 0) {
      this.cdr.detectChanges();
      return;
    }

    this.savingInProgress = true;
    this.logger.debug('GrantDetailComponent onSave()', this.formModel, 'listId:', this.listId);
    const { justificationText, ...fields } = this.formModel;
    const hasFundingFieldChanges = this.currentFundingSnapshot() !== this.initialFundingSnapshot;
    const hasJustificationTextChange = (justificationText ?? '') !== this.initialJustificationText;
    const hasJustificationChanges = this.justificationFiles.length > 0 || hasJustificationTextChange || this.stagedDeleteDocumentIds.length > 0;

    if (!hasFundingFieldChanges && !hasJustificationChanges) {
      this.savingInProgress = false;
      this.isEditMode = false;
      this.initialFormSnapshot = '';
      this.initialFundingSnapshot = '';
      this.initialJustificationText = '';
      this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
      this.saved.emit();
      this.cdr.detectChanges();
      return;
    }

    if (!hasFundingFieldChanges && hasJustificationChanges) {
      this.saveJustification(hasJustificationTextChange ? justificationText : undefined);
      return;
    }

    this.fundingSubmissionsService.bulkUpdateListGrants(
      { applIds: [this.data.applId], fields: fields as FundingSubmBulkEditFieldsDto },
      this.listId
    ).subscribe({
      next: () => {
        this.logger.debug('Grant detail saved');
        this.applyFormModelToData();
        this.initialFundingSnapshot = this.currentFundingSnapshot();
        this.initialFormSnapshot = this.currentSnapshot();
        if (hasJustificationChanges) {
          this.saveJustification(hasJustificationTextChange ? justificationText : undefined);
        } else {
          this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
          this.isEditMode = false;
          this.initialFormSnapshot = '';
          this.initialJustificationText = '';
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

  private isDoNotPayDecisionSelected(): boolean {
    const selectedDecision = this.formModel.docDecision;
    if (!selectedDecision) {
      return false;
    }

    if (String(selectedDecision).trim().toLowerCase() === 'do not pay') {
      return true;
    }

    const selectedOption = this.decisionOptions.find(option => String(option.id) === String(selectedDecision));
    return String(selectedOption?.text || '').trim().toLowerCase() === 'do not pay';
  }

  private clearDoNotPayDependentFields(): void {
    this.formModel.docPriority = null;
    this.formModel.docRecAmt = null;
    this.formModel.docRecReductionPct = null;
    this.formModel.annualFundingR01 = null;
    this.formModel.annualOrMyf = null;
    this.formModel.budgetCategories = null;
    this.formModel.docNciSelection = null;
    this.formModel.justificationText = '';
    this.justificationFiles = [];
    this.justificationFileError = null;
    this.stagedDeleteDocumentIds = this.justificationDocuments
      .map(doc => doc.id)
      .filter((id): id is number => !!id);
    this.recomputeDoNotPayOefiaLock();
  }

  // Determines if the grant was added by OEFIA or if the addedByGroup is null. 
  // addedByGroup null is treated as if the grant was added by OEFIA because prior added grants did not have this field set.
  private isGrantAddedByOefia(): boolean {
    const addedByGroup = this.data?.addedByGroup;
    return addedByGroup == null || String(addedByGroup).trim().toUpperCase() === 'OEFIA';
  }

  private isDocReviewStatus(): boolean {
    return String(this.listStatus || '').trim().toLowerCase().includes('doc review');
  }

  get canEditFundingSubmissionsSection(): boolean {
    return this.docFundingListCor && this.isDocReviewStatus();
  }

  canEditOefiaNotes(): boolean {
    return this.OEFIACertifier && !this.doNotPayOefiaLockActive;
  }

  private recomputeDoNotPayOefiaLock(): void {
    this.doNotPayOefiaLockActive = this.isEditMode
      && this.docFundingListCor
      && this.isGrantAddedByOefia()
      && !this.OEFIACertifier
      && this.isDoNotPayDecisionSelected();
  }

  private validateChangedValues(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (this.doNotPayOefiaLockActive && !String(this.formModel.docNotes || '').trim()) {
      errors.docNotes = 'DOC Notes is required when DOC Decision is Do Not Pay.';
    }

    const pct = this.formModel.docRecReductionPct;
    if (pct != null && (pct < 0 || pct > 100)) {
      errors.docRecReductionPct = 'DOC Rec % Red must be between 0 and 100.';
    }

    if (!errors.docRecReductionPct && pct != null && !this.hasAtMostTwoDecimals(Number(pct))) {
      errors.docRecReductionPct = 'DOC Rec % Red must be a valid percentage with up to 2 decimal places.';
    }

    const amt = this.formModel.docRecAmt;
    if (amt != null && amt < 0) {
      errors.docRecAmt = 'DOC Rec $ cannot be negative.';
    }

    if (!errors.docRecAmt && amt != null && !this.hasAtMostTwoDecimals(Number(amt))) {
      errors.docRecAmt = 'DOC Rec $ must be a valid dollar amount with up to 2 decimal places.';
    }

    const priority = this.formModel.docPriority as any;
    if (priority != null && priority !== '' && (!Number.isInteger(Number(priority)) || Number(priority) < 0)) {
      errors.docPriority = 'DOC Priority must be a non-negative whole number.';
    }

    return errors;
  }

  private getFirstValidationError(errors: Record<string, string>): string | null {
    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey] : null;
  }

  private clearValidationErrors(): void {
    this.saveValidationError = null;
    this.saveValidationErrors = {};
  }

  private hasAtMostTwoDecimals(value: number): boolean {
    if (!Number.isFinite(value)) {
      return false;
    }
    return Math.round(value * 100) === value * 100;
  }

  private saveJustification(justificationText?: string): void {
    const normalizedJustificationText = justificationText === undefined
      ? undefined
      : justificationText.length > 0 ? justificationText : '';
    const deleteDocumentIds = this.stagedDeleteDocumentIds.length > 0 ? this.stagedDeleteDocumentIds : undefined;
    const filesToSave: Array<File | undefined> = this.justificationFiles.length > 0
      ? [...this.justificationFiles]
      : [undefined];

    from(filesToSave).pipe(
      concatMap((file, index) => this.fundingSubmissionsService.saveJustificationForm(
        this.listId,
        this.data.applId,
        file,
        index === 0 ? normalizedJustificationText : undefined,
        index === 0 ? deleteDocumentIds : undefined
      ).pipe(
        tap(document => this.acknowledgeJustificationSave(file, document, index === 0, normalizedJustificationText))
      ))
    ).subscribe({
      complete: () => {
        this.justificationFileError = null;
        this.refreshJustificationData().subscribe(refreshed => {
          if (!refreshed) {
            this.savingInProgress = false;
            this.justificationSaveError = 'Justification changes were saved, but the justification data could not be refreshed.';
            this.cdr.detectChanges();
            return;
          }
          this.syncJustificationAvailableFlag();
          this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
          this.isEditMode = false;
          this.initialFormSnapshot = '';
          this.initialFundingSnapshot = '';
          this.initialJustificationText = '';
          this.savingInProgress = false;
          this.saved.emit();
          this.cdr.detectChanges();
        });
      },
      error: err => {
        this.savingInProgress = false;
        this.justificationSaveError = this.getJustificationSaveError(err);
        this.logger.error('Justification save error', err);
        this.refreshJustificationData().subscribe(() => this.cdr.detectChanges());
      }
    });
  }

  private acknowledgeJustificationSave(
    file: File | undefined,
    document: DocumentsDto,
    isFirstRequest: boolean,
    normalizedJustificationText?: string
  ): void {
    if (file) {
      const fileIndex = this.justificationFiles.indexOf(file);
      if (fileIndex >= 0) {
        this.justificationFiles = this.justificationFiles.filter((_, index) => index !== fileIndex);
      }
      if (document?.id && !this.justificationDocuments.some(existing => existing.id === document.id)) {
        this.justificationDocuments = [...this.justificationDocuments, document];
      }
    }

    if (isFirstRequest) {
      if (normalizedJustificationText !== undefined) {
        this.data.justificationText = normalizedJustificationText;
      }
      this.stagedDeleteDocumentIds = [];
      this.initialJustificationText = this.formModel.justificationText ?? '';
      this.initialFormSnapshot = this.currentSnapshot();
      this.syncJustificationAvailableFlag();
    }
  }

  private getJustificationSaveError(error: any): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }
    return error?.error?.errorMessage
      || error?.error?.message
      || error?.message
      || 'Unable to save the justification.';
  }

  isSaveInProgress(): boolean {
    return this.savingInProgress;
  }

  onNotesModelChange(): void {
    this.justificationSaveError = null;
    this.updateValidationErrorsLive();
    this.cdr.detectChanges();
  }

  private updateValidationErrorsLive(): void {
    if (!this.isEditMode) {
      return;
    }

    // Re-validate only after at least one save attempt has produced messages.
    if (!Object.keys(this.saveValidationErrors || {}).length && !this.saveValidationError) {
      return;
    }

    this.saveValidationErrors = this.validateChangedValues();
    this.saveValidationError = this.getFirstValidationError(this.saveValidationErrors);
  }

  /**
   * Router link for the PFR value's hyperlink — mirrors the existing "View" navigation used by
   * search-result.component.ts's onOpenFundingRequest()/onOpenFundingPlan()
   * (`['request/retrieve', frqId]` / `['plan/retrieve', fprId]`). Returns null when there's no
   * PFR value or its type is unrecognized, so the template falls back to plain text.
   */
  get pfrRouterLink(): any[] | null {
    if (!this.data?.pfr || !this.data?.pfrType) {
      return null;
    }
    if (this.data.pfrType === 'Plan') {
      return ['/plan/retrieve', this.data.pfr];
    }
    if (this.data.pfrType === 'Request') {
      return ['/request/retrieve', this.data.pfr];
    }
    return null;
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
    return fallbackRowName || '';
  }

  get justificationUploadLabelText(): string {
    if (this.justificationFiles.length > 0) {
      return this.justificationFiles.map(file => file.name).join(', ');
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

  get visiblePersistedDocuments(): DocumentsDto[] {
    return this.justificationDocuments.filter(doc => !!doc.id && !this.stagedDeleteDocumentIds.includes(doc.id));
  }

  get visibleAttachedFileCount(): number {
    return this.visiblePersistedDocuments.length + this.justificationFiles.length;
  }

  get isFileUploadDisabled(): boolean {
    return this.doNotPayOefiaLockActive || !!(this.formModel.justificationText && this.formModel.justificationText.trim()) || this.visibleAttachedFileCount >= 3;
  }

  get isJustificationTextDisabled(): boolean {
    return this.doNotPayOefiaLockActive || this.visibleAttachedFileCount > 0;
  }

  onRemovePersistedDocument(docId: number): void {
    if (!docId) {
      return;
    }
    if (!this.stagedDeleteDocumentIds.includes(docId)) {
      this.stagedDeleteDocumentIds = [...this.stagedDeleteDocumentIds, docId];
    }
    this.cdr.detectChanges();
  }

  onRemoveStagedFile(index: number): void {
    this.justificationFiles = this.justificationFiles.filter((_, fileIndex) => fileIndex !== index);
    this.justificationFileError = null;
    this.cdr.detectChanges();
  }

  downloadDocument(id?: number, fileName?: string): void {
    if (!id) {
      return;
    }

    this.documentService.downloadById(id).subscribe({
      next: (response: any) => {
        const blob = new Blob([response.body], { type: response.headers?.get('content-type') || 'application/octet-stream' });
        saveAs(blob, fileName || 'justification-document');
      },
      error: (err: any) => {
        this.logger.error('Failed to download justification document', err);
      }
    });
  }

  hasUnsavedChanges(): boolean {
    if (!this.isEditMode) {
      return false;
    }
    return this.currentSnapshot() !== this.initialFormSnapshot
      || this.justificationFiles.length > 0
      || this.stagedDeleteDocumentIds.length > 0;
  }

  forceDiscardAndClose(): void {
    this.discardEditsAndClose();
  }

  private discardEditsAndClose(): void {
    this.isEditMode = false;
    this.formModel = {};
    this.justificationFiles = [];
    this.justificationFileError = null;
    this.justificationSaveError = null;
    this.stagedDeleteDocumentIds = [];
    this.saveSuccessMessage = '';
    this.clearValidationErrors();
    this.doNotPayOefiaLockActive = false;
    this.initialFormSnapshot = '';
    this.initialFundingSnapshot = '';
    this.initialJustificationText = '';
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
    const doNotPaySelected = this.isDoNotPayDecisionSelected();
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
    // DOC/NCI Selection & Annual/MYF CODE-vs-NAME fix (2026-08-25): docNciSelectionName and
    // annualOrMyfName are what Grant Detail's own read-only view AND the parent grid's columns
    // actually render — mirrors the budgetCategories NAME write-back above. Resolve each NAME
    // from the selected CODE by looking up selectionOptions/annualMyfOptions ({id, text} =
    // {CODE, NAME}), falling back to null when unmatched/cleared (e.g. options not yet loaded).
    const selectedDocNciSelectionOption = this.selectionOptions.find(
      option => option.id === this.formModel.docNciSelection
    );
    this.data.docNciSelectionName          = selectedDocNciSelectionOption?.text ?? null;
    const selectedAnnualOrMyfOption = this.annualMyfOptions.find(
      option => option.id === this.formModel.annualOrMyf
    );
    this.data.annualOrMyfName              = selectedAnnualOrMyfOption?.text ?? null;

    if (doNotPaySelected) {
      this.data.justificationText = '';
      this.justificationDocuments = [];
      if (this.data) {
        this.data.justificationFileName = null;
        this.data.justificationFilename = null;
        this.data.docFilename = null;
      }
      this.syncJustificationAvailableFlag();
    }
  }

  private syncJustificationAvailableFlag(): void {
    const textPresent = !!String(this.data?.justificationText ?? '').trim();
    const documentPresent = (this.justificationDocuments?.length ?? 0) > 0;
    this.data.justificationAvailable = textPresent || documentPresent;
  }

  private refreshJustificationData(): Observable<boolean> {
    if (!this.listId || !this.data?.applId) {
      this.justificationLoaded = true;
      return new Observable(subscriber => {
        subscriber.next(true);
        subscriber.complete();
      });
    }

    return this.fundingSubmissionsService.getJustification(this.listId, this.data.applId).pipe(
      map(justification => {
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
        this.syncJustificationAvailableFlag();
        this.justificationLoaded = true;
        this.cdr.detectChanges();
        return true;
      }),
      catchError(err => {
        this.logger.debug('Unable to load justification documents', err);
        // Still flip the flag on error so a failed fetch never permanently disables Edit.
        this.justificationLoaded = true;
        this.cdr.detectChanges();
        return new Observable<boolean>(subscriber => {
          subscriber.next(false);
          subscriber.complete();
        });
      })
    );
  }

}
