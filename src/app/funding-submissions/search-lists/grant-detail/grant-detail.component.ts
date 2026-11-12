import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FundingSubmBulkEditFieldsDto, FundingSubmissionDocPayDefaultsDto, FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { NGXLogger } from 'ngx-logger';
import { roleNames } from '../../../service/role-names';
import { Select2OptionData } from 'ng-select2';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { saveAs } from 'file-saver';
import { catchError, concatMap, defaultIfEmpty, from, map, Observable, of, Subscription, take, tap } from 'rxjs';

import { DocumentsDto } from '@cbiit/i2efsws-lib/model/documentsDto';
import { DocumentService } from '../../../service/document.service';
import {
  applyDocPayDefaults, DOC_PAY_DEFAULTS_LOOKUP_ERROR, DOC_PAY_SELECTION_FIELDS, DocPayDefaultField, DocPayProvenance,
  docPayDefaultsLookupLogContext, DocPaySelectionField, DocPaySelections, isBlankSelection, isPayDecision,
  requireDocPayDefaults, technicalSupportMailto, isWholeDollarAmount, isValidReductionPctForCalculation, parseExactDecimal, toFiniteNumberOrNull,
  validateDocRecommendation
} from '../../doc-pay-defaults';
import { FundingRequestErrorScopeService } from '../../funding-request-error-scope.service';
import { GrantBudgetCategoryOptions } from '../../grant-budget-category-options';
import {
  FundingWriteRecoveryService, FundingWriteRecoveryState, isDefiniteFundingWriteRejection
} from '../../funding-write-recovery.service';
import { DetailPriorityCoordinator } from '../detail-priority-coordinator';

type GrantEditFormModel = FundingSubmBulkEditFieldsDto & { justificationText?: string };

interface FundingSaveReadback {
  rejectionReason?: string;
  data: FundingSubmissionListGrantDto;
  listId: number;
  editVersion: number;
  submittedForm: GrantEditFormModel;
  baselineForm: GrantEditFormModel;
  fieldVersions: Map<string, number>;
  submittedSnapshot: string;
  outcome: FundingWriteRecoveryState;
  hasJustificationChanges: boolean;
  justificationText?: string;
  files: File[];
  deleteDocumentIds: number[];
}

@Component({
  selector: 'app-grant-detail',
  templateUrl: './grant-detail.component.html',
  styleUrls: ['./grant-detail.component.css']
})
export class GrantDetailComponent implements OnInit, OnChanges, OnDestroy {
  private grantData: any = null;
  private initialized = false;
  private destroyed = false;
  private viewRefreshPending = false;
  private handledDataChange: any = null;
  private grantChangeSequence = 0;
  private readonly grantBudgetOptions: GrantBudgetCategoryOptions;

  @Input()
  set data(value: any) {
    const previousApplId = this.grantData?.applId;
    this.grantData = value;
    if (this.initialized && previousApplId !== value?.applId) {
      this.handledDataChange = value;
      this.prepareForGrantChange();
      this.loadGrantBudgetOptions();
      this.scheduleViewRefresh();
      const sequence = ++this.grantChangeSequence;
      Promise.resolve().then(() => {
        if (!this.destroyed && this.grantChangeSequence === sequence) {
          if (this.handledDataChange === value) this.handledDataChange = null;
          this.refreshJustificationData();
        }
      });
    }
  }
  get data(): any {
    return this.grantData;
  }
  @Input() listId: number;
  @Input() listStatus = 'DOC Review';
  @Input() priorityCoordinator: DetailPriorityCoordinator | null = null;
  @Output() close = new EventEmitter<void>();
  // Emitted when edit mode ends without any row teardown (Cancel, either path) — distinct from
  // `close`, which remains reserved for actual row-collapse/teardown (chevron toggle).
  @Output() editModeExited = new EventEmitter<void>();
  // Emitted after successful saved-value readback (funding-fields and/or justification-only) —
  // lets the parent
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
  // This state describes the current grant's lookup; it does not gate unrelated editing.
  budgetCategoriesLoaded = false;

  formModel: GrantEditFormModel = {};
  docPayDefaultsLoading = false;
  docPayDefaultsError: string | null = null;
  readonly docPayDefaultsLookupError = DOC_PAY_DEFAULTS_LOOKUP_ERROR;
  docPriorityOptionsLoading = false;
  docPriorityOptionsError: string | null = null;
  fundingRefreshError: string | null = null;
  fundingRecoveryState: FundingWriteRecoveryState | null = null;
  fundingRecoveryError: string | null = null;
  unknownOutcomeConfirmed = false;
  private docPayDefaults: FundingSubmissionDocPayDefaultsDto;
  private docPayDefaultsResolved = false;
  private docPayDefaultsSubscription: Subscription;
  private fundingReadbackSubscription: Subscription;
  private fundingSaveSubscription: Subscription;
  private pendingFundingReadback: FundingSaveReadback;
  private unknownFundingReadback: FundingSaveReadback;
  private editVersion = 0;
  private defaultsRequestVersion = 0;
  private provenance = new DocPayProvenance({});
  private observedSelections: DocPaySelections = {};
  private static readonly FUNDING_FIELDS = [
    'docDecision', 'docPriority', 'docRecAmt', 'docRecReductionPct', 'docNciSelection',
    'annualFundingR01', 'budgetCategories', 'docNotes', 'oefiaNotes', 'annualOrMyf'
  ] as const;
  justificationFiles: File[] = [];
  justificationDocuments: DocumentsDto[] = [];
  stagedDeleteDocumentIds: number[] = [];
  justificationFileError: string | null = null;
  justificationSaveError: string | null = null;
  fundingSaveError: string | null = null;
  saveSuccessMessage = '';
  docFundingListCor = false;
  OEFIACertifier = false;
  financialAnalyst = false;
  doNotPayOefiaLockActive = false;
  saveValidationError: string | null = null;
  saveValidationErrors: Record<string, string> = {};
  private touchedRequiredFields = new Set<string>();
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

  // Common dropdowns use the shared lookup; budget categories are grant-specific.
  decisionOptions: Select2OptionData[] = [];
  yesNoOptions: Select2OptionData[] = [];
  annualMyfOptions: Select2OptionData[] = [];
  budgetCategoryOptions: Select2OptionData[] = [];
  selectionOptions: Select2OptionData[] = [];
  docPriorityOptions: Select2OptionData[] = [];
  private docPriorityOptionsSubscription: Subscription;

  constructor(
    private logger: NGXLogger,
    private userSessionService: AppUserSessionService,
    private fundingSubmissionsService: FundingSubmissionsService,
    private propertiesService: AppPropertiesService,
    private cdr: ChangeDetectorRef,
    private modalService: NgbModal,
    private dropdownLookupService: FundingSubmDropdownLookupService,
    private documentService: DocumentService,
    private fundingWriteRecovery: FundingWriteRecoveryService,
    private fundingErrorScope: FundingRequestErrorScopeService
  ) {
    this.grantBudgetOptions = new GrantBudgetCategoryOptions(
      this.fundingSubmissionsService, this.fundingErrorScope, (applId, state) => {
        if (state.status === 'error') {
          this.logger.error('Failed to load grant Budget Categories options', state.error);
        }
        if (this.data?.applId === applId) {
          this.budgetCategoryOptions = state.options;
          this.budgetCategoriesLoaded = true;
          this.scheduleViewRefresh();
        }
      }
    );
  }

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.docFundingListCor = this.userSessionService.hasRole(roleNames.DOC_FUNDING_LIST_COR);
    this.OEFIACertifier = this.userSessionService.hasRole(roleNames.OEFIA_CERTIFIER);
    this.financialAnalyst = this.userSessionService.hasRole(roleNames.FINANCIAL_ANALYST);
    this.fetchDropdownOptions();
    this.refreshJustificationData();
    this.initialized = true;
    this.loadGrantBudgetOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['listId'] || changes['data']) && this.listId && this.data?.applId) {
      this.grantChangeSequence++;
      if (changes['data'] && !changes['listId'] && this.handledDataChange === this.data) {
        this.refreshJustificationData();
      } else {
        this.resetForGrantChange();
      }
    }
    this.handledDataChange = null;

    this.recomputeDoNotPayOefiaLock();
  }

  private resetForGrantChange(): void {
    this.prepareForGrantChange();
    this.refreshJustificationData();
  }

  private prepareForGrantChange(): void {
    this.invalidateFundingRequests();
    this.isEditMode = false;
    this.justificationLoaded = false;
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
    this.dropdownLookupService.getDocNciSelections().subscribe({
      next: options => { this.selectionOptions = options; this.cdr.detectChanges(); },
      error: err => this.logger.error('Failed to load DOC/NCI Selection options', err)
    });
  }

  private loadGrantBudgetOptions(): void {
    this.budgetCategoryOptions = [];
    this.budgetCategoriesLoaded = false;
    const applId = this.data?.applId;
    this.grantBudgetOptions.request(applId);
    const state = this.grantBudgetOptions.state(applId);
    if (state) {
      this.budgetCategoryOptions = state.options;
      this.budgetCategoriesLoaded = state.status !== 'loading';
    }
  }

  get budgetCategoryStatus(): 'loading' | 'ready' | 'error' {
    return this.grantBudgetOptions.state(this.data?.applId)?.status ?? 'error';
  }

  get budgetCategoryOptionsForForm(): Select2OptionData[] {
    return this.grantBudgetOptions.optionsFor(this.data?.applId, this.formModel.budgetCategories);
  }

  get budgetCategorySelectionUnresolved(): boolean {
    return this.grantBudgetOptions.hasUnresolvedSelection(this.data?.applId, this.formModel.budgetCategories);
  }

  retryBudgetCategories(): void {
    this.budgetCategoriesLoaded = false;
    this.grantBudgetOptions.retry(this.data?.applId);
    this.scheduleViewRefresh();
  }

  private scheduleViewRefresh(): void {
    if (this.viewRefreshPending || this.destroyed) return;
    this.viewRefreshPending = true;
    Promise.resolve().then(() => {
      this.viewRefreshPending = false;
      if (!this.destroyed) this.cdr.detectChanges();
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
    if (!this.justificationLoaded || this.savingInProgress || this.pendingFundingReadback) {
      return;
    }
    // DOC users can only edit while list status is DOC Review.
    if (!this.canEnterEditMode) {
      return;
    }
    this.invalidateFundingRequests();
    this.formModel = this.formModelFromGrant(this.data);
    this.provenance = new DocPayProvenance(this.formModel);
    this.observedSelections = { ...this.formModel };
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
    this.fundingSaveError = null;
    this.unknownOutcomeConfirmed = false;
    this.loadFundingRecoveryState();
    if (this.fundingRecoveryState) {
      this.priorityCoordinator?.trackRecovery(this.listId, this.data.applId);
    }
    if (this.fundingRecoveryState === 'saved' || this.fundingRecoveryState === 'conflict') {
      this.pendingFundingReadback = this.createRecoveryReadback(this.fundingRecoveryState);
      this.fundingRefreshError = 'A previous funding save must be refreshed before this grant can be saved again.';
    } else if (this.fundingRecoveryState === 'unknown') {
      this.unknownFundingReadback = this.createRecoveryReadback('unknown');
    }
    this.fetchDocPriorityOptions();
    this.recomputeDoNotPayOefiaLock();
    this.cdr.detectChanges();
  }

  fetchDocPriorityOptions(): void {
    if (this.docPriorityOptionsSubscription && !this.docPriorityOptionsSubscription.closed) {
      this.docPriorityOptionsSubscription.unsubscribe();
    }
    const listId = this.listId;
    const applId = this.data?.applId;
    const editVersion = this.editVersion;
    this.docPriorityOptions = [];
    this.docPriorityOptionsError = null;
    if (!listId || !applId) {
      return;
    }

    this.docPriorityOptionsLoading = true;
    this.docPriorityOptionsSubscription = this.fundingErrorScope.handleLocally(
      this.fundingSubmissionsService.getDocPriorityOptions(listId, applId)
    ).pipe(
      defaultIfEmpty(null),
      map(priorities => {
        if (!Array.isArray(priorities)) throw new Error('DOC Priority options were not returned.');
        return priorities;
      }),
      take(1)
    ).subscribe({
      next: priorities => {
        if (!this.isEditMode || this.editVersion !== editVersion || this.listId !== listId
          || this.data?.applId !== applId) return;
        this.docPriorityOptions = priorities.map(priority => ({ id: String(priority), text: String(priority) }));
        this.docPriorityOptionsLoading = false;
        this.checkPreviewPriorityOption();
        this.cdr.detectChanges();
      },
      error: error => {
        if (!this.isEditMode || this.editVersion !== editVersion || this.listId !== listId
          || this.data?.applId !== applId) return;
        this.docPriorityOptionsLoading = false;
        this.docPriorityOptionsError = 'Unable to load DOC Priority options. Retry to select a priority.';
        this.logger.error('Failed to load DOC Priority options', error, { listId, applId });
        this.cdr.detectChanges();
      }
    });
  }

  private checkPreviewPriorityOption(): void {
    if (this.docPriorityOptionsLoading || !this.needsDocPayDefaults() || !this.docPayDefaultsResolved
      || this.provenance.intent(this.data.applId).priorityMode !== 'AUTO'
      || isBlankSelection(this.formModel.docPriority)) {
      return;
    }
    if (!this.docPriorityOptions.some(option => String(option.id) === String(this.formModel.docPriority))) {
      this.docPriorityOptionsError = 'The previewed DOC Priority is not in the current options. Retry the options.';
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.grantBudgetOptions.destroy();
    this.invalidateFundingRequests();
    if (this.fundingSaveSubscription && !this.fundingSaveSubscription.closed) {
      this.fundingSaveSubscription.unsubscribe();
    }
    if (this.docPriorityOptionsSubscription && !this.docPriorityOptionsSubscription.closed) {
      this.docPriorityOptionsSubscription.unsubscribe();
    }
  }

  onDocDecisionChange(): void {
    this.loadDocPayDefaults();
    this.recomputeDoNotPayOefiaLock();
    this.updateValidationErrorsLive();
    this.cdr.detectChanges();
  }

  onDocPaySelectionChange(field: DocPaySelectionField): void {
    if (this.formModel[field] !== this.observedSelections[field]) {
      this.provenance.recordUserEdit(field);
      this.observedSelections[field] = this.formModel[field];
    }
  }

  onUserSelectChange(field: DocPaySelectionField | 'docPriority' | 'docDecision', value: string | null): void {
    this.formModel[field] = value;
    this.touchedRequiredFields.add(field);
    this.provenance.recordUserEdit(field);
    if (field === 'docDecision') {
      this.onDocDecisionChange();
    } else if (field === 'docPriority') {
      this.onValidationFieldChange();
    } else {
      this.observedSelections[field] = value;
      this.updateValidationErrorsLive();
      // Let Select2 finish its event before changed options can recreate the widget.
      this.scheduleViewRefresh();
    }
  }

  private cancelDocPayDefaults(): void {
    this.defaultsRequestVersion++;
    if (this.docPayDefaultsSubscription && !this.docPayDefaultsSubscription.closed) {
      this.docPayDefaultsSubscription.unsubscribe();
    }
    this.docPayDefaultsLoading = false;
    this.docPayDefaultsError = null;
    this.docPayDefaults = undefined;
    this.docPayDefaultsResolved = false;
  }

  private invalidateFundingRequests(): void {
    this.editVersion++;
    this.cancelDocPayDefaults();
    if (this.fundingReadbackSubscription && !this.fundingReadbackSubscription.closed) {
      this.fundingReadbackSubscription.unsubscribe();
    }
    if (this.pendingFundingReadback) {
      this.priorityCoordinator?.endReadback(
        this.pendingFundingReadback.listId, this.pendingFundingReadback.data.applId
      );
    }
    this.pendingFundingReadback = undefined;
    this.unknownFundingReadback = undefined;
    this.fundingRefreshError = null;
    this.savingInProgress = false;
  }

  loadDocPayDefaults(): void {
    this.cancelDocPayDefaults();
    if (this.savingInProgress || this.pendingFundingReadback || !this.needsDocPayDefaults()) {
      return;
    }

    const data = this.data;
    const listId = this.listId;
    const form = this.formModel;
    const requestedFields = { ...form };
    this.provenance.preparePreview(form);
    this.observedSelections = { ...form };
    const versions = this.provenance.snapshot();
    const requestVersion = this.defaultsRequestVersion;
    const editVersion = this.editVersion;
    const isCurrent = () => this.isEditMode && this.data === data && this.listId === listId
      && this.formModel === form && this.editVersion === editVersion
      && this.defaultsRequestVersion === requestVersion
      && isPayDecision(form.docDecision, this.decisionOptions);

    this.docPayDefaultsLoading = true;
    this.docPayDefaultsSubscription = this.fundingErrorScope.handleLocally(
      this.fundingSubmissionsService.getDocPayDefaults(listId, [data.applId])
    ).pipe(
      defaultIfEmpty([]),
      map(defaults => requireDocPayDefaults(defaults, data.applId)),
      take(1)
    ).subscribe({
      next: defaults => {
        if (!isCurrent()) return;
        const appliedPriority = applyDocPayDefaults(form, defaults, field =>
          form[field] === requestedFields[field]
          && this.provenance.mayApplyDefault(field, versions));
        if (appliedPriority) this.provenance.markAutomaticPriorityApplied();
        for (const field of DOC_PAY_SELECTION_FIELDS) this.observedSelections[field] = form[field];
        this.docPayDefaults = defaults;
        this.docPayDefaultsResolved = true;
        this.docPayDefaultsLoading = false;
        this.checkPreviewPriorityOption();
        this.updateValidationErrorsLive();
        this.cdr.detectChanges();
      },
      error: error => {
        if (!isCurrent()) return;
        this.docPayDefaultsLoading = false;
        if (error instanceof HttpErrorResponse) {
          this.docPayDefaultsError = DOC_PAY_DEFAULTS_LOOKUP_ERROR;
          this.logger.error('Failed to load DOC Pay defaults',
            docPayDefaultsLookupLogContext(error, listId, [data.applId]));
        } else {
          this.docPayDefaultsError = this.getSaveErrorMessage(error, 'Unable to load DOC Pay defaults. Please try again.');
          this.logger.error('Failed to load DOC Pay defaults', error);
        }
        this.cdr.detectChanges();
      }
    });
  }

  get technicalSupportMailto(): string {
    return technicalSupportMailto(this.propertiesService.getProperty('TECH_SUPPORT_EMAIL'));
  }

  private needsDocPayDefaults(): boolean {
    return this.isEditMode && this.isDoNotPayDecisionValue(this.data?.docDecision)
      && isPayDecision(this.formModel.docDecision, this.decisionOptions);
  }

  get budgetCategoriesDisplay(): string {
    if (this.isEditMode && this.docPayDefaults
      && this.formModel.budgetCategories === this.docPayDefaults.budgetCategories) {
      return this.docPayDefaults.budgetCategoriesName ?? this.docPayDefaults.budgetCategories;
    }
    return this.data?.budgetCategories;
  }

  get annualOrMyfDisplay(): string {
    if (this.isEditMode && this.docPayDefaults
      && this.formModel.annualOrMyf === this.docPayDefaults.annualOrMyf) {
      return this.docPayDefaults.annualOrMyfName ?? this.docPayDefaults.annualOrMyf;
    }
    return this.data?.annualOrMyfName;
  }

  private get isDoNotPayRestricted(): boolean {
    const addedByGroup = String(this.data?.addedByGroup ?? '').trim().toUpperCase();
    return this.docFundingListCor && addedByGroup.includes('DOC');
  }

  get docDecisionOptions(): Select2OptionData[] {
    if (!this.isDoNotPayRestricted) {
      return this.decisionOptions;
    }

    return this.decisionOptions.map(option => ({
      ...option,
      disabled: String(option.text || '').trim().toLowerCase() === 'do not pay'
        || String(option.id || '').trim().toLowerCase() === 'do not pay'
        || option.disabled
    }));
  }

  onValidationFieldChange(): void {
    this.touchedRequiredFields.add('docPriority');
    this.updateValidationErrorsLive();
    this.cdr.detectChanges();
  }

  onRequiredFieldBlur(field: 'docRecReductionPct' | 'docRecAmt' | 'docPriority'): void {
    this.touchedRequiredFields.add(field);
    this.updateValidationErrorsLive();
    this.cdr.detectChanges();
  }

  get hasSaveValidationErrors(): boolean {
    return Object.keys(this.validateChangedValues()).length > 0 || !!this.justificationFileError
      || this.docPayDefaultsLoading || !!this.docPayDefaultsError || !!this.pendingFundingReadback
      || !!this.fundingRecoveryState || !!this.fundingRecoveryError
      || (this.needsDocPayDefaults() && (this.docPriorityOptionsLoading || !!this.docPriorityOptionsError));
  }

  onDocRecReductionPctChange(): void {
    this.provenance.recordUserEdit('docRecReductionPct');
    this.touchedRequiredFields.add('docRecReductionPct');
    const reductionPct = toFiniteNumberOrNull(this.formModel.docRecReductionPct);
    const baseAmount = parseExactDecimal(this.data?.originalRequestedTotal);
    const parsedReductionPct = parseExactDecimal(this.formModel.docRecReductionPct);
    if (baseAmount != null
      && baseAmount.coefficient > 0n
      && reductionPct != null
      && parsedReductionPct != null
      && isValidReductionPctForCalculation(reductionPct)) {
      const pctScale = 10n ** BigInt(parsedReductionPct.scale);
      const numerator = baseAmount.coefficient * (100n * pctScale - parsedReductionPct.coefficient);
      const denominator = 10n ** BigInt(baseAmount.scale) * pctScale;
      const amount = Number(this.roundHalfUpDivision(numerator, denominator * 100n));
      if (this.formModel.docRecAmt !== amount) this.provenance.recordChange('docRecAmt');
      this.formModel.docRecAmt = amount;
    }

    this.updateDocRecValidationLive();
    this.cdr.detectChanges();
  }

  onDocRecAmtChange(): void {
    this.provenance.recordUserEdit('docRecAmt');
    this.touchedRequiredFields.add('docRecAmt');
    const updatedAmount = toFiniteNumberOrNull(this.formModel.docRecAmt);
    const baseAmount = parseExactDecimal(this.data?.originalRequestedTotal);
    const parsedAmount = parseExactDecimal(this.formModel.docRecAmt);
    if (baseAmount != null
      && baseAmount.coefficient > 0n
      && updatedAmount != null
      && updatedAmount >= 0
      && isWholeDollarAmount(this.formModel.docRecAmt)
      && parsedAmount != null) {
      const commonScale = Math.max(baseAmount.scale, parsedAmount.scale);
      const scaledBase = baseAmount.coefficient * (10n ** BigInt(commonScale - baseAmount.scale));
      const scaledAmount = parsedAmount.coefficient * (10n ** BigInt(commonScale - parsedAmount.scale));
      const reductionHundredths = this.roundHalfUpDivision((scaledBase - scaledAmount) * 10000n, scaledBase);
      const reduction = Number(reductionHundredths) / 100;
      if (this.formModel.docRecReductionPct !== reduction) this.provenance.recordChange('docRecReductionPct');
      this.formModel.docRecReductionPct = reduction;
    }

    this.updateDocRecValidationLive();
    this.cdr.detectChanges();
  }

  onCancel(): void {
    if (!this.isEditMode || this.savingInProgress || this.pendingFundingReadback) {
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
    if (this.savingInProgress || this.justificationFileError || this.docPayDefaultsLoading
      || this.docPayDefaultsError || this.pendingFundingReadback || this.fundingRecoveryState
      || this.fundingRecoveryError || this.prioritySaveBlocked
      || (this.needsDocPayDefaults() && (this.docPriorityOptionsLoading || this.docPriorityOptionsError))) {
      return;
    }
    if (this.needsDocPayDefaults() && !this.docPayDefaultsResolved) {
      this.loadDocPayDefaults();
      if (this.docPayDefaultsLoading || this.docPayDefaultsError) return;
    }
    this.suppressNextLeavePrompt = true;
    this.justificationSaveError = null;
    this.fundingSaveError = null;

    // For DOC users this field is view-only; ignore any client-side model tampering.
    // OEFIA users can edit this field and their change must be preserved.
    if (this.docFundingListCor && !this.canEditOefiaNotes()) {
      this.formModel.oefiaNotes = this.data?.oefiaNotes ?? '';
    }

    // Business rule: when DOC Decision is Do Not Pay, dependent funding and
    // justification fields are discarded before validation/persistence.
    if (this.isDoNotPayDecisionSelected() && !this.isDoNotPayRestricted) {
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
    const saveFields = this.normalizeFieldsForSave(fields as FundingSubmBulkEditFieldsDto);
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

    if (this.priorityCoordinator && !this.priorityCoordinator.beginWrite(this.listId, this.data.applId)) {
      this.savingInProgress = false;
      this.cdr.detectChanges();
      return;
    }

    const readback: FundingSaveReadback = {
      data: this.data,
      listId: this.listId,
      editVersion: this.editVersion,
      submittedForm: { ...this.formModel },
      baselineForm: this.formModelFromGrant(this.data),
      fieldVersions: this.provenance.snapshot(),
      submittedSnapshot: this.currentSnapshot(),
      outcome: 'unknown',
      hasJustificationChanges,
      justificationText: hasJustificationTextChange ? justificationText : undefined,
      files: [...this.justificationFiles],
      deleteDocumentIds: [...this.stagedDeleteDocumentIds]
    };
    try {
      this.fundingWriteRecovery.begin(this.listId, this.data.applId);
      this.fundingRecoveryState = 'unknown';
    } catch (error) {
      this.savingInProgress = false;
      this.loadFundingRecoveryState();
      if (this.fundingRecoveryState) {
        readback.outcome = this.fundingRecoveryState;
        if (this.fundingRecoveryState === 'unknown') {
          this.unknownFundingReadback = readback;
          this.fundingSaveError = 'A previous funding save has an unknown outcome. Do not retry until support confirms it is final.';
        } else {
          this.pendingFundingReadback = readback;
          this.fundingRefreshError = 'A previous funding save must be refreshed before this grant can be saved again.';
        }
      } else if (!this.fundingRecoveryError) {
        this.fundingRecoveryError = this.getSaveErrorMessage(error, 'Funding save recovery is unavailable.');
      }
      if (!this.fundingRecoveryState) {
        if (this.fundingRecoveryError) {
          this.priorityCoordinator?.setRecoveryUnavailable(this.listId, true);
        }
        this.priorityCoordinator?.finishWrite(this.listId, this.data.applId);
      }
      this.logger.error('Unable to prepare funding save recovery', error);
      this.cdr.detectChanges();
      return;
    }

    const request = {
      applIds: [this.data.applId],
      fields: saveFields,
      ...(this.needsDocPayDefaults() ? { transitionIntents: [this.provenance.intent(this.data.applId)] } : {})
    };
    this.fundingSaveSubscription = this.fundingErrorScope.handleLocally(
      this.fundingSubmissionsService.bulkUpdateListGrants(request, this.listId)
    ).pipe(defaultIfEmpty(null), take(1)).subscribe({
      next: count => {
        if (count !== 1) {
          this.handleFundingWriteFailure(readback, new Error('The funding save returned an unexpected response.'));
          return;
        }
        try {
          this.fundingWriteRecovery.mark(readback.listId, readback.data.applId, 'saved');
        } catch (error) {
          this.handleFundingWriteFailure(readback, error);
          return;
        }
        if (!this.isCurrentFundingSave(readback)) return;
        this.logger.debug('Grant detail saved');
        readback.outcome = 'saved';
        this.fundingRecoveryState = 'saved';
        this.initialFundingSnapshot = this.currentFundingSnapshot(readback.submittedForm);
        this.initialFormSnapshot = readback.submittedSnapshot;
        this.pendingFundingReadback = readback;
        this.refreshSavedFunding();
      },
      error: error => this.handleFundingWriteFailure(readback, error)
    });
  }

  private handleFundingWriteFailure(readback: FundingSaveReadback, error: unknown): void {
    let state: FundingWriteRecoveryState | null = 'unknown';
    try {
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 409) {
        this.fundingWriteRecovery.mark(readback.listId, readback.data.applId, 'conflict');
        state = 'conflict';
      } else if (isDefiniteFundingWriteRejection(error)) {
        this.fundingWriteRecovery.clear(readback.listId, readback.data.applId);
        state = null;
      }
    } catch (storageError) {
      this.logger.error('Unable to update funding save recovery state', storageError);
      if (this.isCurrentFundingSave(readback)) {
        this.fundingRecoveryError = this.getSaveErrorMessage(storageError, 'Funding save recovery is unavailable.');
      }
    }
    if (state === null) {
      this.priorityCoordinator?.finishWrite(readback.listId, readback.data.applId);
    }
    if (!this.isCurrentFundingSave(readback)) return;

    this.fundingRecoveryState = state;
    this.savingInProgress = false;
    this.logger.error('Grant detail save error', error);
    readback.rejectionReason = this.getFundingRejectionReason(error);
    if (state === 'conflict') {
      readback.outcome = 'conflict';
      this.pendingFundingReadback = readback;
      this.fundingSaveError = readback.rejectionReason
        ?? 'The grant changed on the server. Refresh and review your changes before saving.';
      this.refreshSavedFunding();
    } else if (state === 'unknown') {
      this.unknownFundingReadback = readback;
      this.fundingSaveError = 'The funding save outcome is unknown. Do not retry until support confirms it is final.';
    } else {
      this.fundingSaveError = readback.rejectionReason
        ?? this.getSaveErrorMessage(error, 'Unable to save the grant changes. Please try again.');
    }
    this.cdr.detectChanges();
  }

  private isDoNotPayDecisionSelected(): boolean {
    return this.isDoNotPayDecisionValue(this.formModel.docDecision);
  }

  private isDoNotPayDecisionValue(selectedDecision: string): boolean {
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

  private normalizeFieldsForSave(fields: FundingSubmBulkEditFieldsDto): FundingSubmBulkEditFieldsDto {
    return {
      ...fields,
      // API expects code values; UI/model can occasionally hold display text.
      docDecision: this.normalizeOptionValueToId(fields.docDecision, this.decisionOptions),
      docNciSelection: this.normalizeOptionValueToId(fields.docNciSelection, this.selectionOptions),
      annualOrMyf: this.normalizeOptionValueToId(fields.annualOrMyf, this.annualMyfOptions),
      // The form already stores a category code. A grant's ACTCD name can itself
      // resemble another code, so reverse-matching names could change an untouched value.
      budgetCategories: String(fields.budgetCategories ?? '').trim() || null
    };
  }

  private normalizeOptionValueToId(
    value: string | null | undefined,
    options: Select2OptionData[] | null | undefined
  ): string | null {
    const rawValue = String(value ?? '').trim();
    if (!rawValue) {
      return null;
    }

    const normalizedRawValue = rawValue.toLowerCase();
    const optionList = options ?? [];

    const idMatch = optionList.find(option => String(option?.id ?? '').trim().toLowerCase() === normalizedRawValue);
    if (idMatch) {
      return String(idMatch.id);
    }

    const textMatch = optionList.find(option => String(option?.text ?? '').trim().toLowerCase() === normalizedRawValue);
    if (textMatch) {
      return String(textMatch.id);
    }

    return rawValue;
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

  private isReadOnlyDocStatusForDocUser(): boolean {
    if (this.canEditOefiaNotes()) {
      return false;
    }

    const reviewStatusCode = String(this.data?.reviewStatusCode || '').trim().toUpperCase();
    if (reviewStatusCode) {
      return reviewStatusCode === 'OEFIAREVIEW' || reviewStatusCode === 'DIRECTORREVIEW';
    }

    const reviewStatus = String(this.data?.reviewStatus || '').trim().toLowerCase();
    if (reviewStatus) {
      return reviewStatus.includes('oefia review') || reviewStatus.includes('nci director review');
    }

    const status = String(this.listStatus || '').trim().toLowerCase();
    return status.includes('oefia review') || status.includes('nci director review');
  }

  private hasConfirmedAndLockedApproveRejectDecision(): boolean {
    if (!this.data?.lockedDate) {
      return false;
    }

    const nciDecision = String(this.data?.nciDecision || '').trim().toUpperCase();
    return nciDecision === 'APPROVE' || nciDecision === 'REJECTED' || nciDecision === 'REJECT';
  }

  get canEnterEditMode(): boolean {
    // Confirmed/locked Approve/Reject director decisions are immutable.
    if (this.hasConfirmedAndLockedApproveRejectDecision() && this.canEditOefiaNotes()) {
      return false;
    }

    // Requirement: DOC users are read-only in OEFIA Review and NCI Director Review.
    if (this.docFundingListCor) {
      return !this.isReadOnlyDocStatusForDocUser();
    }

    return true;
  }

  get canEditFundingSubmissionsSection(): boolean {
    return this.canEnterEditMode;
  }

  canEditOefiaNotes(): boolean {
    return this.OEFIACertifier || this.financialAnalyst;
  }

  get isDocNotesRequired(): boolean {
    return this.isDoNotPayDecisionSelected() && !this.isDoNotPayRestricted;
  }

  private recomputeDoNotPayOefiaLock(): void {
    const doNotPaySelected = this.isDoNotPayDecisionSelected();
    const docShouldLock = this.docFundingListCor
      && this.isGrantAddedByOefia()
      && !this.canEditOefiaNotes();
    const oefiaShouldLock = this.canEditOefiaNotes();

    this.doNotPayOefiaLockActive = this.isEditMode
      && doNotPaySelected
      && (docShouldLock || oefiaShouldLock);
  }

  private validateChangedValues(includeUntouchedRequired = true): Record<string, string> {
    const errors: Record<string, string> = {};

    if (this.isDoNotPayRestricted && this.isDoNotPayDecisionSelected()) {
      errors.docDecision = 'Do Not Pay is not available for grants added by a DOC user.';
    }

    if (isBlankSelection(this.formModel.docDecision)
      && (includeUntouchedRequired || this.touchedRequiredFields.has('docDecision'))) {
      errors.docDecision = 'DOC Decision is required';
    }

    if (this.isDocNotesRequired && !String(this.formModel.docNotes || '').trim()) {
      errors.docNotes = 'DOC Notes is required when DOC Decision is Do Not Pay.';
    }

    if (this.isDoNotPayDecisionSelected()) {
      return errors;
    }

    const requiredFields = {
      budgetCategories: 'Budget Categories',
      docNciSelection: 'DOC/NCI Selection',
      annualFundingR01: 'Two-Year Annual Funding R01 (HRHR)',
      annualOrMyf: 'Annual or MYF'
    };
    for (const field of Object.keys(requiredFields)) {
      const value = this.formModel[field];
      if (isBlankSelection(value)
        && (includeUntouchedRequired || this.touchedRequiredFields.has(field))) {
        errors[field] = `${requiredFields[field]} is required`;
      }
    }

    return {
      ...errors,
      ...validateDocRecommendation(this.formModel, {
        isRequired: field => includeUntouchedRequired || this.touchedRequiredFields.has(field)
      })
    };
  }

  private getFirstValidationError(errors: Record<string, string>): string | null {
    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey] : null;
  }

  private clearValidationErrors(): void {
    this.touchedRequiredFields.clear();
    this.saveValidationError = null;
    this.saveValidationErrors = {};
  }

  private roundHalfUpDivision(numerator: bigint, denominator: bigint): bigint {
    const negative = numerator < 0n;
    const absoluteNumerator = negative ? -numerator : numerator;
    const quotient = absoluteNumerator / denominator;
    const remainder = absoluteNumerator % denominator;
    const rounded = quotient + (remainder * 2n >= denominator ? 1n : 0n);
    return negative ? -rounded : rounded;
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
        this.loadJustificationData().subscribe(refreshed => {
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
        this.loadJustificationData().subscribe(() => this.cdr.detectChanges());
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

  private getFundingRejectionReason(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('error' in error)
      || typeof error.error !== 'object' || error.error === null) return undefined;
    const body = error.error as {
      errorMessage?: unknown; detail?: unknown; message?: unknown;
    };
    return [body.errorMessage, body.detail, body.message]
      .find((message): message is string => typeof message === 'string' && !!message.trim())?.trim();
  }

  private getSaveErrorMessage(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null) {
      return fallback;
    }
    const response = error as { error?: unknown; message?: unknown };
    if (typeof response.error === 'string' && response.error.trim()) {
      return response.error;
    }
    if (typeof response.error === 'object' && response.error !== null) {
      const body = response.error as { errorMessage?: unknown; detail?: unknown; message?: unknown };
      const serverMessage = [body.errorMessage, body.detail, body.message]
        .find((message): message is string => typeof message === 'string' && Boolean(message.trim()));
      if (serverMessage) {
        return serverMessage;
      }
    }
    return typeof response.message === 'string' && response.message.trim()
      ? response.message
      : fallback;
  }

  private getJustificationSaveError(error: any): string {
    if (error?.status === 409) {
      const body = error.error;
      const reasonCode = body?.additionalData?.reasonCode;
      const recognizedReason = ['GRANT_NOT_ACTIVE', 'GRANT_LOCKED', 'DOC_STAGE_READ_ONLY'].includes(reasonCode);
      if (recognizedReason && typeof body?.errorMessage === 'string' && body.errorMessage.trim()) {
        return body.errorMessage.trim();
      }
      return 'The justification could not be saved because its status changed. Refresh and try again.';
    }
    return this.getSaveErrorMessage(error, 'Unable to save the justification.');
  }

  isSaveInProgress(): boolean {
    return this.savingInProgress;
  }

  get prioritySaveBlocked(): boolean {
    return !!this.priorityCoordinator?.isBlocked(this.listId, this.data?.applId);
  }

  onNotesModelChange(field?: 'docNotes' | 'oefiaNotes' | 'justificationText'): void {
    if (field) this.provenance.recordUserEdit(field);
    this.justificationSaveError = null;
    this.updateValidationErrorsLive();
    this.cdr.detectChanges();
  }

  private updateValidationErrorsLive(): void {
    if (!this.isEditMode) {
      return;
    }

    this.saveValidationErrors = this.validateChangedValues(false);
    this.saveValidationError = this.getFirstValidationError(this.saveValidationErrors);
  }

  private updateDocRecValidationLive(): void {
    this.updateValidationErrorsLive();
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
    this.invalidateFundingRequests();
    this.isEditMode = false;
    this.formModel = {};
    this.justificationFiles = [];
    this.justificationFileError = null;
    this.justificationSaveError = null;
    this.fundingSaveError = null;
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

  private currentSnapshot(form: GrantEditFormModel = this.formModel): string {
    return JSON.stringify({
      docDecision: form.docDecision ?? null,
      docPriority: form.docPriority ?? null,
      docRecAmt: form.docRecAmt ?? null,
      docRecReductionPct: form.docRecReductionPct ?? null,
      docNciSelection: form.docNciSelection ?? null,
      annualFundingR01: form.annualFundingR01 ?? null,
      budgetCategories: form.budgetCategories ?? null,
      docNotes: form.docNotes ?? '',
      oefiaNotes: form.oefiaNotes ?? '',
      annualOrMyf: form.annualOrMyf ?? null,
      justificationText: form.justificationText ?? ''
    });
  }

  private currentFundingSnapshot(form: GrantEditFormModel = this.formModel): string {
    return JSON.stringify({
      docDecision: form.docDecision ?? null,
      docPriority: form.docPriority ?? null,
      docRecAmt: form.docRecAmt ?? null,
      docRecReductionPct: form.docRecReductionPct ?? null,
      docNciSelection: form.docNciSelection ?? null,
      annualFundingR01: form.annualFundingR01 ?? null,
      budgetCategories: form.budgetCategories ?? null,
      docNotes: form.docNotes ?? '',
      oefiaNotes: form.oefiaNotes ?? '',
      annualOrMyf: form.annualOrMyf ?? null
    });
  }

  rebaseDocPriority(priority: number | null, refreshAutomaticPreview = false): void {
    const persistedPriority = priority == null ? null : String(priority);
    if (this.isEditMode && this.initialFundingSnapshot && this.initialFormSnapshot) {
      const fundingBaseline: GrantEditFormModel = JSON.parse(this.initialFundingSnapshot);
      const formBaseline: GrantEditFormModel = JSON.parse(this.initialFormSnapshot);
      const automaticPreview = this.needsDocPayDefaults()
        && this.provenance.intent(this.data.applId).priorityMode === 'AUTO';
      const untouched = !this.provenance.hasUserEdit('docPriority')
        && (automaticPreview || this.formModel.docPriority === fundingBaseline.docPriority);
      if (untouched && (!automaticPreview || refreshAutomaticPreview)
        && this.formModel.docPriority !== persistedPriority) {
        this.formModel.docPriority = persistedPriority;
        this.provenance.recordChange('docPriority');
      }
      fundingBaseline.docPriority = persistedPriority;
      formBaseline.docPriority = persistedPriority;
      this.initialFundingSnapshot = this.currentFundingSnapshot(fundingBaseline);
      this.initialFormSnapshot = this.currentSnapshot(formBaseline);
      if (untouched && automaticPreview && refreshAutomaticPreview) {
        this.loadDocPayDefaults();
      }
    }
    this.data.docPriority = priority;
  }

  private formModelFromGrant(grant: FundingSubmissionListGrantDto): GrantEditFormModel {
    return {
      docDecision: grant.docDecision ?? null,
      docPriority: !this.isDoNotPayDecisionValue(grant.docDecision) && grant.docPriority != null
        ? String(grant.docPriority) : null,
      docRecAmt: grant.docRecommendedAmount ?? null,
      docRecReductionPct: grant.docRecommendedReductionPct ?? null,
      docNciSelection: grant.docNciSelection ?? null,
      annualFundingR01: grant.annualFundingR01 === undefined
        ? (grant.twoYearAnnualFundingR01Flag ? 'Yes' : null)
        : grant.annualFundingR01,
      budgetCategories: grant.budgetCategoryCode ?? null,
      docNotes: grant.docNotes ?? '',
      oefiaNotes: grant.oefiaNotes ?? '',
      annualOrMyf: grant.annualOrMyf ?? null,
      justificationText: grant.justificationText ?? ''
    };
  }

  private isCurrentFundingSave(readback: FundingSaveReadback): boolean {
    return this.isEditMode && this.editVersion === readback.editVersion
      && this.data === readback.data && this.listId === readback.listId;
  }

  private loadFundingRecoveryState(): void {
    this.fundingRecoveryError = null;
    try {
      this.fundingRecoveryState = this.fundingWriteRecovery.get(this.listId, this.data.applId)?.state ?? null;
    } catch (error) {
      this.fundingRecoveryState = null;
      this.fundingRecoveryError = this.getSaveErrorMessage(error, 'Funding save recovery is unavailable.');
      this.logger.error('Unable to load funding save recovery state', error);
    }
  }

  private createRecoveryReadback(outcome: FundingWriteRecoveryState): FundingSaveReadback {
    return {
      data: this.data,
      listId: this.listId,
      editVersion: this.editVersion,
      submittedForm: { ...this.formModel },
      baselineForm: this.formModelFromGrant(this.data),
      fieldVersions: this.provenance.snapshot(),
      submittedSnapshot: this.currentSnapshot(),
      outcome,
      hasJustificationChanges: false,
      files: [...this.justificationFiles],
      deleteDocumentIds: [...this.stagedDeleteDocumentIds]
    };
  }

  recoverUnknownFunding(): void {
    if (this.fundingRecoveryState !== 'unknown' || !this.unknownOutcomeConfirmed || this.fundingRecoveryError) return;
    this.pendingFundingReadback = this.unknownFundingReadback ?? this.createRecoveryReadback('unknown');
    this.pendingFundingReadback.outcome = 'unknown';
    this.refreshSavedFunding();
  }

  refreshSavedFunding(): void {
    const readback = this.pendingFundingReadback;
    if (!readback || !this.isCurrentFundingSave(readback)
      || (this.fundingReadbackSubscription && !this.fundingReadbackSubscription.closed)) {
      return;
    }
    if (this.priorityCoordinator
      && !this.priorityCoordinator.beginReadback(readback.listId, readback.data.applId)) {
      this.fundingRefreshError = 'Another grant is being refreshed. Retry refresh when it completes.';
      this.cdr.detectChanges();
      return;
    }
    this.savingInProgress = true;
    this.fundingRefreshError = null;
    this.fundingReadbackSubscription = this.fundingErrorScope.handleLocally(
      this.fundingSubmissionsService.getListDetail(readback.listId)
    ).pipe(
      defaultIfEmpty(null),
      map(detail => {
        const grant = detail?.grants?.find(row => row.applId === readback.data.applId);
        if (!grant) throw new Error('The saved grant is not present in the refreshed list.');
        if (this.isCurrentFundingSave(readback) && this.pendingFundingReadback === readback) {
          const previousPriority = readback.baselineForm.docPriority;
          const moved = String(previousPriority ?? '') !== String(grant.docPriority ?? '');
          this.priorityCoordinator?.applyReadback(readback.listId, readback.data.applId, detail, moved);
        }
        return grant;
      }),
      take(1)
    ).subscribe({
      next: grant => {
        this.priorityCoordinator?.endReadback(readback.listId, readback.data.applId);
        if (!this.isCurrentFundingSave(readback) || this.pendingFundingReadback !== readback) return;
        try {
          this.fundingWriteRecovery.clear(readback.listId, readback.data.applId);
        } catch (error) {
          this.savingInProgress = false;
          this.fundingRefreshError = this.getSaveErrorMessage(error, 'Funding save recovery could not be cleared.');
          this.logger.error('Unable to complete funding save recovery', error);
          this.cdr.detectChanges();
          return;
        }
        const unchanged = this.currentSnapshot() === readback.submittedSnapshot
          && GrantDetailComponent.FUNDING_FIELDS.every(field => this.provenance.unchangedSince(field, readback.fieldVersions))
          && this.justificationFiles.length === readback.files.length
          && this.justificationFiles.every((file, index) => file === readback.files[index])
          && JSON.stringify(this.stagedDeleteDocumentIds) === JSON.stringify(readback.deleteDocumentIds);
        const persistedForm = this.formModelFromGrant(grant);
        Object.assign(this.data, grant);
        for (const field of GrantDetailComponent.FUNDING_FIELDS) {
          const changedSinceSubmit = !this.provenance.unchangedSince(field, readback.fieldVersions)
            || this.formModel[field] !== readback.submittedForm[field];
          const isDefaultField = [...DOC_PAY_SELECTION_FIELDS, 'docPriority', 'docRecAmt', 'docRecReductionPct']
            .includes(field as DocPayDefaultField);
          const changedBeforeSubmit = !this.provenance.unchangedSince(field, new Map())
            || (!isDefaultField && this.formModel[field] !== readback.baselineForm[field]);
          if (!changedSinceSubmit && (readback.outcome === 'saved' || !changedBeforeSubmit)) {
            Object.assign(this.formModel, { [field]: persistedForm[field] });
          }
        }
        this.provenance = this.provenance.rebase(
          persistedForm, readback.fieldVersions, readback.outcome !== 'saved'
        );
        this.observedSelections = { ...this.formModel };
        this.docPayDefaults = undefined;
        this.initialFundingSnapshot = this.currentFundingSnapshot(persistedForm);
        this.initialFormSnapshot = this.currentSnapshot(persistedForm);
        this.initialJustificationText = persistedForm.justificationText;
        this.pendingFundingReadback = undefined;
        this.unknownFundingReadback = undefined;
        this.fundingRecoveryState = null;
        this.unknownOutcomeConfirmed = false;
        this.fundingRefreshError = null;
        this.priorityCoordinator?.finishWrite(readback.listId, readback.data.applId);
        if (readback.outcome === 'saved' && unchanged && readback.hasJustificationChanges) {
          this.saveJustification(readback.justificationText);
          return;
        }
        if (readback.outcome !== 'saved') {
          this.fundingSaveError = readback.rejectionReason
            ?? 'Server values were refreshed. Review your unsaved changes before saving.';
          this.savingInProgress = false;
          this.cancelDocPayDefaults();
          this.fetchDocPriorityOptions();
          if (this.needsDocPayDefaults()) this.loadDocPayDefaults();
          this.updateValidationErrorsLive();
          this.saved.emit();
          this.cdr.detectChanges();
          return;
        }
        this.saveSuccessMessage = `Success! You have successfully updated Grant Selection for ${this.data.grantNumber}`;
        if (unchanged) {
          this.isEditMode = false;
          this.initialFormSnapshot = '';
          this.initialJustificationText = '';
        } else {
          this.saveSuccessMessage += ' Your newer edits have not been saved.';
          this.updateValidationErrorsLive();
        }
        this.savingInProgress = false;
        this.saved.emit();
        this.cdr.detectChanges();
      },
      error: error => {
        this.priorityCoordinator?.endReadback(readback.listId, readback.data.applId);
        if (!this.isCurrentFundingSave(readback) || this.pendingFundingReadback !== readback) return;
        this.savingInProgress = false;
        this.fundingRefreshError = readback.outcome === 'saved'
          ? 'Grant changes were saved, but the saved values could not be refreshed. Retry refresh before saving again.'
          : 'The grant could not be refreshed. Retry refresh before saving again.';
        this.logger.error('Failed to refresh saved grant changes', error);
        this.cdr.detectChanges();
      }
    });
  }

  private syncJustificationAvailableFlag(): void {
    const textPresent = !!String(this.data?.justificationText ?? '').trim();
    const documentPresent = (this.justificationDocuments?.length ?? 0) > 0;
    this.data.justificationAvailable = textPresent || documentPresent;
  }

  private refreshJustificationData(): void {
    this.loadJustificationData().subscribe();
  }

  private loadJustificationData(): Observable<boolean> {
    if (!this.listId || !this.data?.applId) {
      this.justificationLoaded = true;
      return of(true);
    }

    const listId = this.listId;
    const applId = this.data.applId;
    const requestVersion = this.editVersion;
    const isCurrent = () => !this.destroyed && this.editVersion === requestVersion
      && this.listId === listId && this.data?.applId === applId;
    return this.fundingSubmissionsService.getJustification(listId, applId).pipe(
      map(justification => {
        if (!isCurrent()) return false;
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
        if (!isCurrent()) return of(false);
        this.logger.debug('Unable to load justification documents', err);
        // Still flip the flag on error so a failed fetch never permanently disables Edit.
        this.justificationLoaded = true;
        this.cdr.detectChanges();
        return of(false);
      })
    );
  }

}
