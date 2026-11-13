import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { catchError, concatMap, defaultIfEmpty, defer, from, map, Observable, of, Subject, Subscription, take, takeWhile, toArray } from 'rxjs';
import {
  FundingSubmissionsService, FundingSubmBulkEditFieldsDto, FundingSubmissionListGrantDto,
  FundingSubmissionTransitionIntentDto
} from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { Select2OptionData } from 'ng-select2';
import { DataTableDirective } from 'angular-datatables';
import { FullGrantNumberCellRendererComponent } from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { logger } from 'codelyzer/util/logger';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { roleNames } from '../../../service/role-names';
import {
  applyDocPayDefaults, DOC_PAY_DEFAULTS_LOOKUP_ERROR, DOC_PAY_SELECTION_FIELDS, DocPayDefaultField, DocPayProvenance,
  docPayDefaultsLookupLogContext, DocPaySelectionField, DocPaySelections, isBlankSelection, isPayDecision,
  requireDocPayDefaults, technicalSupportMailto, validateDocRecommendation
} from '../../doc-pay-defaults';
import { FundingRequestErrorScopeService } from '../../funding-request-error-scope.service';
import { GrantBudgetCategoryOptions } from '../../grant-budget-category-options';
import {
  FundingWriteRecoveryService, FundingWriteRecoveryState, isDefiniteFundingWriteRejection
} from '../../funding-write-recovery.service';

type EditableBulkRow = Omit<FundingSubmissionListGrantDto, 'docPriority'>
  & Omit<FundingSubmBulkEditFieldsDto, 'docPriority'> & { docPriority?: string | number };

interface BulkRowReadback {
  listId: number;
  editVersion: number;
  rowsReference: EditableBulkRow[];
  submittedRow: EditableBulkRow;
  baselineRow: EditableBulkRow;
  fieldVersions: Map<string, number>;
  outcome: FundingWriteRecoveryState;
  transitionIntent?: FundingSubmissionTransitionIntentDto;
}

interface BulkWriteOutcome {
  applId: number;
  status: FundingWriteRecoveryState | 'rejected' | 'not-sent';
  message?: string;
}

declare var $: any;

@Component({
  selector: 'app-bulk-edit',
  templateUrl: './bulk-edit.component.html',
  styleUrls: ['./bulk-edit.component.css']
})
export class BulkEditComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('budgetCatRenderer')   budgetCatRenderer:   TemplateRef<any>;
  @ViewChild('docDecisionRenderer') docDecisionRenderer: TemplateRef<any>;
  @ViewChild('docNciSelRenderer')   docNciSelRenderer:   TemplateRef<any>;
  @ViewChild('annualR01Renderer')   annualR01Renderer:   TemplateRef<any>;
  @ViewChild('annualMyfRenderer')   annualMyfRenderer:   TemplateRef<any>;
  @ViewChild('docNotesRenderer')    docNotesRenderer:    TemplateRef<any>;
  @ViewChild('oefiaNotesRenderer')  oefiaNotesRenderer:  TemplateRef<any>;
  @ViewChild('backToListWarningModal') private backToListWarningModalRef: TemplateRef<any>;
  @ViewChild('doNotPayWarningModal') private doNotPayWarningModalTpl: TemplateRef<any>;
  @ViewChild('saveSuccessAlert') saveSuccessAlert: ElementRef<HTMLElement>;
  @ViewChild('bulkForm') bulkForm: NgForm;

  private modalRef: NgbModalRef;
  private doNotPayWarningModalRef: NgbModalRef;

  listId = 0;
  selectionDate = '';
  fromRoute = '';
  grantViewerUrl = '';
  eGrantsUrl = '';
  i2eURL = '';
  rows: any[] = [];
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  // Typed against the generated FundingSubmBulkEditFieldsDto (2026-08-24 stability-audit
  // hardening) so a future field rename/addition on the DTO surfaces as a compile error here,
  // instead of silently drifting the way the old hand-rolled inline type could.
  bulkFields: Partial<FundingSubmBulkEditFieldsDto> = {};

  canSave = false;
  isSaving = false;
  saveSuccessMessage = '';
  saveErrorMessage = '';
  bulkWriteOutcomeMessage = '';
  docFundingListCor = false;
  OEFIACertifier = false;
  private lastSavedRows: any[] = [];
  private pendingRealignFrame: number | null = null;
  private readonly doNotPayDocNotesErrorMessage = 'DOC Notes is required when DOC Decision is Do Not Pay.';
  private doNotPayDocNotesErrorRowIds = new Set<number>();
  private mandatoryFieldErrorRowMap = new Map<number, Set<string>>();
  private rowRequiredValidationEnabled = false;
  private recommendationErrorRowIds = new Set<number>();
  recommendationErrorMessage = '';
  private bulkFieldsApplied = false;
  private bulkDoNotPayWithBlankDocNotesApplied = false;
  docPayDefaultsLoading = false;
  docPayDefaultsError = '';
  readonly docPayDefaultsLookupError = DOC_PAY_DEFAULTS_LOOKUP_ERROR;
  fundingRecoveryError = '';
  confirmedUnknownRows: Record<number, boolean> = {};
  private docPayDefaultsSubscription: Subscription;
  private fundingReadbackSubscription: Subscription;
  private fundingSaveSubscription: Subscription;
  private readonly pendingFundingReadbacks = new Map<number, BulkRowReadback>();
  private readonly unknownFundingReadbacks = new Map<number, BulkRowReadback>();
  private readonly fundingRecoveryStates = new Map<number, FundingWriteRecoveryState>();
  private readonly acknowledgedRows = new Set<number>();
  private priorityRefreshRequired = false;
  private editVersion = 0;
  private defaultsRequestVersion = 0;
  private docPayDefaultsResolvedRows = new Set<number>();
  private provenanceByRow = new Map<number, DocPayProvenance>();
  private observedSelections = new Map<number, DocPaySelections>();
  private readonly grantBudgetOptions: GrantBudgetCategoryOptions;
  private budgetRenderPending = false;
  private destroyed = false;

  get savedChangesNeedRefresh(): boolean {
    return this.pendingFundingReadbacks.size > 0 || this.priorityRefreshRequired;
  }

  get unknownRecoveryRows(): EditableBulkRow[] {
    return this.rows.filter(row => this.fundingRecoveryStates.get(row.applId) === 'unknown');
  }

  get hasAnyBulkFieldValue(): boolean {
    const f = this.bulkFields;
    return !!(f.budgetCategories || f.docDecision || f.docNciSelection ||
              f.annualFundingR01 || f.annualOrMyf || f.docNotes ||
              (this.canEditOefiaNotes() && f.oefiaNotes));
  }

  get showApplyBeforeSaveTooltip(): boolean {
    return (this.hasAnyBulkFieldValue && !this.bulkFieldsApplied && !this.canSave && !this.isSaving)
      || (this.hasDoNotPayDocNotesErrors && !this.isSaving);
  }

  get hasDoNotPayDocNotesErrors(): boolean {
    return this.doNotPayDocNotesErrorRowIds.size > 0;
  }

  get hasMandatoryFieldErrors(): boolean {
    return this.mandatoryFieldErrorRowMap.size > 0;
  }

  get hasRecommendationErrors(): boolean {
    return this.recommendationErrorRowIds.size > 0;
  }

  get showBulkDoNotPayDocNotesError(): boolean {
    return !this.isDocOnlyUser()
      && this.bulkDoNotPayWithBlankDocNotesApplied
      && this.hasDoNotPayDocNotesErrors;
  }

  // The shared Bulk selector remains generic; row options are keyed by applId.
  decisionOptions: Select2OptionData[] = [];
  docNciOptions: Select2OptionData[] = [];
  yesNoOptions: Select2OptionData[] = [];
  annualMyfOptions: Select2OptionData[] = [];
  budgetCategoryOptions: Select2OptionData[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private logger: NGXLogger,
    private fundingSubmissionsService: FundingSubmissionsService,
    private propertiesService: AppPropertiesService,
    private modalService: NgbModal,
    private dropdownLookupService: FundingSubmDropdownLookupService,
    private userSessionService: AppUserSessionService,
    private fundingWriteRecovery: FundingWriteRecoveryService,
    private fundingErrorScope: FundingRequestErrorScopeService,
    private cdr: ChangeDetectorRef
  ) {
    this.grantBudgetOptions = new GrantBudgetCategoryOptions(
      this.fundingSubmissionsService, this.fundingErrorScope, (_applId, state) => {
        if (state.status === 'error') {
          this.logger.error('Failed to load grant Budget Categories options', state.error);
        }
        this.scheduleBudgetRender();
      }
    );
  }

  ngOnInit(): void {
    this.invalidateFundingRequests();
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl     = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL         = this.propertiesService.getProperty('I2EWEB_URL').trim();
    this.docFundingListCor = this.userSessionService.hasRole(roleNames.DOC_FUNDING_LIST_COR);
    this.OEFIACertifier = this.userSessionService.hasRole(roleNames.OEFIA_CERTIFIER);
    this.fetchDropdownOptions();
    const state = history.state;
    this.listId = state?.listId ?? 0;
    this.selectionDate = state?.selectionDate ?? '';
    this.fromRoute = state?.from || this.route.snapshot.queryParamMap.get('from') || '';
    const grants: any[] = state?.grants ?? [];
    this.logger.debug(JSON.stringify(grants));
    // Normalize DataTable row data field names to match FundingSubmBulkEditFieldsDto.
    // NOTE: bulkUpdateListGrants() on the backend does a full-overwrite of every field on
    // FundingSubmBulkEditFieldsDto (including docRecAmt/docRecReductionPct/docPriority/recused)
    // for every saved row — there is no "omitted = leave untouched" semantics. Bulk Edit's UI
    // doesn't expose these fields, so they MUST be carried through unchanged from the source
    // grant data here and in onSave()'s payload, or they will be silently nulled out on save
    // (bug found 2026-08-24: "DOC Rec $" set via Individual Edit was wiped by a subsequent
    // Bulk Edit save).
    this.rows = grants.map(g => this.editableRowFromGrant(g));
    this.rows.forEach(row => {
      this.observedSelections.set(row.applId, { ...row });
      this.provenanceByRow.set(row.applId, new DocPayProvenance(row));
    });
    this.lastSavedRows = JSON.parse(JSON.stringify(this.rows));
    this.loadFundingRecoveryStates();
    this.logger.debug(JSON.stringify(this.rows));
    if (!this.docFundingListCor) {
      this.rows.forEach(row => this.grantBudgetOptions.request(row.applId));
    }
  }

  getBudgetCategoryOptionsForRow(row: EditableBulkRow): Select2OptionData[] {
    return this.grantBudgetOptions.optionsFor(row.applId, row.budgetCategories);
  }

  getBudgetCategoryStatus(row: EditableBulkRow): 'loading' | 'ready' | 'error' {
    return this.grantBudgetOptions.state(row.applId)?.status ?? 'error';
  }

  isBudgetCategoryUnresolved(row: EditableBulkRow): boolean {
    return this.grantBudgetOptions.hasUnresolvedSelection(row.applId, row.budgetCategories);
  }

  retryBudgetCategories(row: EditableBulkRow): void {
    this.grantBudgetOptions.retry(row.applId);
    this.scheduleBudgetRender();
  }

  private scheduleBudgetRender(): void {
    if (this.budgetRenderPending || this.destroyed) return;
    this.budgetRenderPending = true;
    Promise.resolve().then(() => {
      this.budgetRenderPending = false;
      if (!this.destroyed) this.cdr.detectChanges();
    });
  }

  private fetchDropdownOptions(): void {
    this.dropdownLookupService.getDocDecisions().subscribe({
      next: options => this.decisionOptions = options,
      error: err => this.logger.error('Failed to load DOC Decision options', err)
    });
    this.dropdownLookupService.getDocNciSelections().subscribe({
      next: options => this.docNciOptions = options,
      error: err => this.logger.error('Failed to load DOC/NCI Selection options', err)
    });
    this.dropdownLookupService.getAnnualFundingR01Options().subscribe({
      next: options => this.yesNoOptions = options,
      error: err => this.logger.error('Failed to load Two-Year Annual Funding R01 options', err)
    });
    this.dropdownLookupService.getAnnualOrMyfOptions().subscribe({
      next: options => this.annualMyfOptions = options,
      error: err => this.logger.error('Failed to load Annual or MYF options', err)
    });
    this.dropdownLookupService.getBudgetCategories().subscribe({
      next: options => this.budgetCategoryOptions = options,
      error: err => this.logger.error('Failed to load Budget Categories options', err)
    });
  }

  ngAfterViewInit(): void {
    const columns: any[] = [
      {
        title: 'Grant Number',
        data: 'grantNumber',
        width: '130px',
        className: 'all',
        defaultContent: '',
        ngTemplateRef: { ref: this.fullGrantNumberRenderer }
      }, // 0
      {
        title: 'PI',
        data: 'piName',
        width: '130px',
        defaultContent: '',
        render: (data: string, _t: any, row: any) => data ? `<a href="mailto:${row.piEmail}?subject=${row.grantNumber} - ${row.piName}">${data}</a>` : ''
      }, // 1
      {
        title: 'Budget Categories',
        data: 'budgetCategories',
        width: '130px',
        defaultContent: '',
        ngTemplateRef: { ref: this.budgetCatRenderer }
      }, // 2
      {
        title: 'DOC Decision',
        data: 'docDecision',
        width: '120px',
        defaultContent: '',
        ngTemplateRef: { ref: this.docDecisionRenderer }
      }, // 3
      {
        title: 'DOC/NCI Selection',
        data: 'docNciSelection',
        width: '140px',
        defaultContent: '',
        ngTemplateRef: { ref: this.docNciSelRenderer }
      }, // 4
      {
        title: 'Two-Year Annual Funding R01 (HRHR)',
        data: 'annualFundingR01',
        width: '100px',
        defaultContent: '',
        ngTemplateRef: { ref: this.annualR01Renderer }
      }, // 5
      {
        title: 'Annual or MYF',
        data: 'annualOrMyf',
        width: '120px',
        defaultContent: '',
        ngTemplateRef: { ref: this.annualMyfRenderer }
      }, // 6
      {
        title: 'DOC Notes',
        data: 'docNotes',
        width: '220px',
        defaultContent: '',
        ngTemplateRef: { ref: this.docNotesRenderer }
      }, // 7
    ];

    if (!this.docFundingListCor) {
      columns.push({
        title: 'OEFIA Notes',
        data: 'oefiaNotes',
        width: '220px',
        defaultContent: '',
        ngTemplateRef: { ref: this.oefiaNotesRenderer }
      });
    }

    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      scrollX: true,
      autoWidth: false,
      processing: false,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" title="Last"></i>'
        }
      },
      // Reads this.rows live via closure (not captured by value) — reassigning this.rows
      // (e.g. in onReset()) followed by dt.ajax.reload() correctly re-renders with the new rows.
      ajax: (_params: any, callback: any) => {
        callback({ data: this.rows, recordsTotal: this.rows.length, recordsFiltered: this.rows.length });
      },
      columns: columns.filter(column => !this.docFundingListCor
        || !['budgetCategories', 'annualOrMyf'].includes(column.data)),
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      rowCallback: (row: Node, _data: any) => {
        // Remove stale elements left by DataTables before ngTemplateRef injects
        this.dtOptions.columns.forEach((column: any, ind: number) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell && cell.childNodes.length > 1) {
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      },
      drawCallback: () => {
        setTimeout(() => {
          this.dtElement?.dtInstance?.then((dt: DataTables.Api) => dt.columns.adjust());
        }, 0);
      },
    };
    setTimeout(() => this.dtTrigger.next(null));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.grantBudgetOptions.destroy();
    this.invalidateFundingRequests();
    if (this.fundingSaveSubscription && !this.fundingSaveSubscription.closed) {
      this.fundingSaveSubscription.unsubscribe();
    }
    if (this.pendingRealignFrame !== null) {
      window.cancelAnimationFrame(this.pendingRealignFrame);
      this.pendingRealignFrame = null;
    }
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.realignDataTableColumns();
  }

  private realignDataTableColumns(): void {
    if (this.pendingRealignFrame !== null) {
      window.cancelAnimationFrame(this.pendingRealignFrame);
    }

    this.pendingRealignFrame = window.requestAnimationFrame(() => {
      this.pendingRealignFrame = null;
      this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
        dt.columns.adjust();
      });
    });
  }

  // Exact persisted payload fields sent to bulkUpdateListGrants() (FS-2277). Save enablement is
  // derived from whether any of these fields differs from the last-saved snapshot, rather than
  // from a one-way "something changed" event latch, so initial-render/binding emissions that
  // fire without an actual value change do not enable Save.
  private static readonly PERSISTED_FIELDS: string[] = [
    'budgetCategories', 'docDecision', 'docNciSelection', 'annualFundingR01', 'annualOrMyf',
    'docNotes', 'oefiaNotes', 'docPriority', 'docRecAmt', 'docRecReductionPct', 'recused'
  ];

  private isRowDirty(row: any): boolean {
    const saved = this.lastSavedRows.find(r => r.applId === row.applId);
    if (!saved) {
      return true;
    }
    return BulkEditComponent.PERSISTED_FIELDS.some(field => {
      if (field === 'oefiaNotes' && !this.canEditOefiaNotes()) {
        return false;
      }
      return row[field] !== saved[field];
    });
  }

  private recomputeCanSave(): void {
    this.canSave = !this.fundingRecoveryError && this.rows.some(row => this.isRowDirty(row)
      && !this.fundingRecoveryStates.has(row.applId));
  }

  private shouldSubmitRow(row: EditableBulkRow): boolean {
    return !this.fundingRecoveryStates.has(row.applId)
      && (!this.acknowledgedRows.has(row.applId) || this.isRowDirty(row));
  }

  private provenanceFor(row: EditableBulkRow): DocPayProvenance {
    let provenance = this.provenanceByRow.get(row.applId);
    if (!provenance) {
      provenance = new DocPayProvenance(this.getLastSavedRow(row) ?? row);
      this.provenanceByRow.set(row.applId, provenance);
    }
    return provenance;
  }

  private isDocOnlyUser(): boolean {
    return this.docFundingListCor && !this.OEFIACertifier;
  }

  canEditOefiaNotes(): boolean {
    return !this.isDocOnlyUser() && this.OEFIACertifier;
  }

  private getLastSavedRow(row: any): any {
    return this.lastSavedRows.find(r => r.applId === row.applId);
  }

  private restoreReadOnlyOefiaNotes(): void {
    if (this.canEditOefiaNotes()) {
      return;
    }
    for (const row of this.rows) {
      const saved = this.getLastSavedRow(row);
      if (saved) {
        row.oefiaNotes = saved.oefiaNotes;
      }
    }
  }

  private isDoNotPayDecisionValue(decision: any): boolean {
    const normalizedDecision = String(Array.isArray(decision) ? decision[0] : (decision ?? '')).trim().toLowerCase();
    if (!normalizedDecision) {
      return false;
    }

    if (
      normalizedDecision === 'do not pay'
      || normalizedDecision.includes('do not pay')
    ) {
      return true;
    }

    const selectedOption = this.decisionOptions.find(option => String(option.id) === String(decision));
    const optionText = String(selectedOption?.text ?? '').trim().toLowerCase();
    const optionId = String(selectedOption?.id ?? '').trim().toLowerCase();

    return (
      optionText.includes('do not pay')
    );
  }

  private isGrantAddedByDoc(row: any): boolean {
    const addedByGroup = String(row?.addedByGroup ?? '').trim().toUpperCase();
    return !!addedByGroup && addedByGroup.includes('DOC');
  }

  private isGrantAddedByOefia(row: any): boolean {
    const addedByGroup = String(row?.addedByGroup ?? '').trim().toUpperCase();
    return !addedByGroup || addedByGroup.includes('OEFIA');
  }

  private isDoNotPayOption(option: Select2OptionData): boolean {
    const optionText = String(option?.text ?? '').trim().toLowerCase();
    return optionText.includes('do not pay');
  }

  private shouldDisableDoNotPayForRow(row: any): boolean {
    return this.isDocOnlyUser() && this.isGrantAddedByDoc(row);
  }

  getDocDecisionOptionsForRow(row: any): Select2OptionData[] {
    if (!this.shouldDisableDoNotPayForRow(row)) {
      return this.decisionOptions;
    }

    return this.decisionOptions.map(option => ({
      ...option,
      disabled: this.isDoNotPayOption(option) ? true : (option as any).disabled
    }));
  }

  private shouldWarnDoNotPayForDocAddedGrants(): boolean {
    if (!this.isDocOnlyUser()) {
      return false;
    }

    if (!this.isDoNotPayDecisionValue(this.bulkFields.docDecision)) {
      return false;
    }

    return this.rows.some(row => this.isGrantAddedByDoc(row));
  }

  private applyBulkChanges(skipDoNotPayForDocAdded: boolean): void {
    const f = this.bulkFields;
    this.bulkDoNotPayWithBlankDocNotesApplied = this.isDoNotPayDecisionValue(f.docDecision)
      && !String(f.docNotes ?? '').trim();
    for (const row of this.rows) {
      const skipRowDoNotPay = skipDoNotPayForDocAdded
        && this.isDoNotPayDecisionValue(f.docDecision)
        && this.isGrantAddedByDoc(row);

      const provenance = this.provenanceFor(row);
      for (const field of ['budgetCategories', 'docDecision', 'docNciSelection', 'annualFundingR01',
        'annualOrMyf', 'docNotes'] as const) {
        if (f[field] && !(skipRowDoNotPay && (field === 'docDecision' || field === 'docNotes'))) {
          row[field] = f[field];
          provenance.recordUserEdit(field);
        }
      }
      if (this.canEditOefiaNotes() && f.oefiaNotes) {
        row.oefiaNotes = f.oefiaNotes;
        provenance.recordUserEdit('oefiaNotes');
      }
      if (!skipRowDoNotPay && this.isDoNotPayDecisionValue(row.docDecision)) {
        this.clearDoNotPayDependentFields(row);
      }
    }

    this.restoreReadOnlyOefiaNotes();
    this.rowRequiredValidationEnabled = true;
    this.loadDocPayDefaults();
    this.bulkFieldsApplied = true;
    this.updateDoNotPayDocNotesValidationErrors();
    this.updateMandatoryFieldValidationErrors();
    this.updateRecommendationValidationErrors();
    // Apply Changes only enables Save when it actually changed at least one row's persisted
    // value; it must not leave a stale canSave=true when the shared values matched every row.
    this.recomputeCanSave();
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload(null, false));
  }

  isDoNotPayDecisionSelected(decision: string | null | undefined): boolean {
    return this.isDoNotPayDecisionValue(decision);
  }

  private clearDoNotPayDependentFields(target: any): void {
    target.recused = null;
    target.docPriority = null;
    target.docRecAmt = null;
    target.docRecReductionPct = null;
    target.budgetCategories = null;
    target.docNciSelection = null;
    target.annualFundingR01 = null;
    target.annualOrMyf = null;
  }

  private enforceDoNotPayRulesForRows(rows: EditableBulkRow[]): void {
    rows.forEach(row => {
      if (this.isDoNotPayDecisionValue(row.docDecision)) {
        this.clearDoNotPayDependentFields(row);
      }
    });
  }

  private updateDoNotPayDocNotesValidationErrors(): boolean {
    this.doNotPayDocNotesErrorRowIds.clear();
    this.rows.forEach(row => {
      if (!this.shouldSubmitRow(row)) return;
      if (this.isDoNotPayDecisionValue(row.docDecision) && !String(row.docNotes || '').trim()) {
        this.doNotPayDocNotesErrorRowIds.add(Number(row.applId));
      }
    });
    return this.doNotPayDocNotesErrorRowIds.size === 0;
  }

  private isBlankSelection(value: any): boolean {
    return isBlankSelection(value);
  }

  private updateMandatoryFieldValidationErrors(): boolean {
    this.mandatoryFieldErrorRowMap.clear();

    this.rows.forEach(row => {
      if (!this.shouldSubmitRow(row)) return;
      const rowErrors = new Set<string>();

      if (this.isBlankSelection(row.docDecision)) {
        rowErrors.add('docDecision');
      }

      if (!this.isDoNotPayDecisionValue(row.docDecision)) {
        if (this.isBlankSelection(row.budgetCategories)) {
          rowErrors.add('budgetCategories');
        }
        if (this.isBlankSelection(row.docNciSelection)) {
          rowErrors.add('docNciSelection');
        }
        if (this.isBlankSelection(row.annualFundingR01)) {
          rowErrors.add('annualFundingR01');
        }
        if (this.isBlankSelection(row.annualOrMyf)) {
          rowErrors.add('annualOrMyf');
        }
      }

      if (rowErrors.size > 0) {
        this.mandatoryFieldErrorRowMap.set(Number(row.applId), rowErrors);
      }
    });

    return this.mandatoryFieldErrorRowMap.size === 0;
  }

  hasMandatoryFieldError(row: any, field: string): boolean {
    if (!this.rowRequiredValidationEnabled) {
      return false;
    }

    const applId = Number(row?.applId);
    const rowErrors = this.mandatoryFieldErrorRowMap.get(applId);
    return !!rowErrors && rowErrors.has(field);
  }

  private updateRecommendationValidationErrors(): boolean {
    const failingRows = this.rows.filter(row => this.shouldSubmitRow(row)
      && isPayDecision(row.docDecision, this.decisionOptions)
      && !(this.needsDocPayDefaults(row) && !this.docPayDefaultsResolvedRows.has(row.applId))
      && Object.keys(validateDocRecommendation(row, { isRequired: () => true })).length > 0);
    this.recommendationErrorRowIds = new Set(failingRows.map(row => row.applId));
    this.recommendationErrorMessage = failingRows.length
      ? 'DOC recommended amount, reduction, and priority must be supplied and valid for '
        + `${failingRows.map(row => row.grantNumber ?? row.applId).join(', ')}. Correct them in Individual Edit.`
      : '';
    return failingRows.length === 0;
  }

  getMandatoryFieldErrorMessage(fieldLabel: string): string {
    return `${fieldLabel} is required`;
  }

  hasDoNotPayDocNotesError(row: any): boolean {
    return this.doNotPayDocNotesErrorRowIds.has(Number(row?.applId));
  }

  getDoNotPayDocNotesErrorMessage(): string {
    return this.doNotPayDocNotesErrorMessage;
  }

  private clearSaveMessages(): void {
    this.saveSuccessMessage = '';
    this.saveErrorMessage = '';
    this.bulkWriteOutcomeMessage = '';
  }

  private getSaveErrorMessage(error: unknown): string {
    if (typeof error !== 'object' || error === null) {
      return 'Unable to save the grant changes. Please try again.';
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
      : 'Unable to save the grant changes. Please try again.';
  }

  // Called from the per-row DataTable cell renderers (bulk-edit.component.html) whenever a
  // grant row's field is edited directly, so "Save" enables even without going through the
  // shared "Apply Changes" flow. Recomputes dirty state instead of latching true so
  // initialization/binding emissions with no actual value change leave Save disabled (FS-2277).
  onRowFieldChange(row?: EditableBulkRow, field?: DocPaySelectionField): void {
    if (row && field) {
      const observed = this.observedSelections.get(row.applId) ?? {};
      if (row[field] !== observed[field]) {
        this.provenanceFor(row).recordUserEdit(field);
        observed[field] = row[field];
      }
      this.observedSelections.set(row.applId, observed);
    }
    this.restoreReadOnlyOefiaNotes();
    this.updateDoNotPayDocNotesValidationErrors();
    if (this.rowRequiredValidationEnabled) {
      this.updateMandatoryFieldValidationErrors();
      this.updateRecommendationValidationErrors();
    }
    this.recomputeCanSave();
  }

  onUserRowSelectChange(
    row: EditableBulkRow, field: DocPaySelectionField | 'docDecision', value: string | null
  ): void {
    row[field] = value;
    this.provenanceFor(row).recordUserEdit(field);
    if (field === 'docDecision') {
      this.onRowDocDecisionChange(row);
    } else {
      const observed = this.observedSelections.get(row.applId) ?? {};
      observed[field] = value;
      this.observedSelections.set(row.applId, observed);
      this.onRowFieldChange();
    }
  }

  onUserRowNotesChange(row: EditableBulkRow, field: 'docNotes' | 'oefiaNotes'): void {
    this.provenanceFor(row).recordUserEdit(field);
    this.onRowFieldChange();
  }

  onRowDocDecisionChange(row: any): void {
    if (this.shouldDisableDoNotPayForRow(row) && this.isDoNotPayDecisionValue(row?.docDecision)) {
      row.docDecision = null;
    }

    if (this.isDoNotPayDecisionValue(row?.docDecision)) {
      this.clearDoNotPayDependentFields(row);
    }
    this.loadDocPayDefaults();
    this.onRowFieldChange();
  }

  onBulkDocDecisionChange(): void {
    this.bulkFieldsApplied = false;
    this.bulkDoNotPayWithBlankDocNotesApplied = false;

    if (this.isDoNotPayDecisionValue(this.bulkFields.docDecision)) {
      this.clearDoNotPayDependentFields(this.bulkFields);
    }
  }

  onUserBulkSelectChange(field: DocPaySelectionField | 'docDecision', value: string | null): void {
    this.bulkFields[field] = value;
    if (field === 'docDecision') this.onBulkDocDecisionChange();
    else this.onBulkFieldChange();
  }

  onBulkFieldChange(): void {
    this.bulkFieldsApplied = false;
    if (String(this.bulkFields.docNotes ?? '').trim()) {
      this.bulkDoNotPayWithBlankDocNotesApplied = false;
    }
  }

  onApplyChanges(): void {
    this.clearSaveMessages();

    if (this.shouldWarnDoNotPayForDocAddedGrants()) {
      this.doNotPayWarningModalRef = this.modalService.open(this.doNotPayWarningModalTpl, { centered: true });
      return;
    }

    this.applyBulkChanges(false);
  }

  onProceedDoNotPayWarning(): void {
    this.doNotPayWarningModalRef?.close();
    this.applyBulkChanges(true);
  }

  onCancelDoNotPayWarning(): void {
    this.doNotPayWarningModalRef?.dismiss();
  }

  onReset(): void {
    if (this.savedChangesNeedRefresh) return;
    this.invalidateFundingRequests();
    this.provenanceByRow.clear();
    this.acknowledgedRows.clear();
    this.bulkForm?.resetForm();
    this.bulkFields = {};
    this.bulkFieldsApplied = false;
    this.bulkDoNotPayWithBlankDocNotesApplied = false;
    this.rows = JSON.parse(JSON.stringify(this.lastSavedRows));
    this.rows.forEach(row => {
      this.observedSelections.set(row.applId, { ...row });
      this.provenanceByRow.set(row.applId, new DocPayProvenance(row));
    });
    this.loadFundingRecoveryStates();
    this.doNotPayDocNotesErrorRowIds.clear();
    this.mandatoryFieldErrorRowMap.clear();
    this.rowRequiredValidationEnabled = false;
    this.recommendationErrorRowIds.clear();
    this.recommendationErrorMessage = '';
    this.recomputeCanSave();
    this.clearSaveMessages();
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload(null, false));
  }

  onSave(): void {
    if (!this.rows.length || !this.canSave || this.isSaving || this.docPayDefaultsLoading
      || this.docPayDefaultsError || this.fundingRecoveryError || this.savedChangesNeedRefresh
      || this.unknownRecoveryRows.length) return;
    const rowsToSave: EditableBulkRow[] = this.rows.filter(row => this.shouldSubmitRow(row));
    if (!rowsToSave.length) return;
    if (rowsToSave.some(row => this.needsDocPayDefaults(row) && !this.docPayDefaultsResolvedRows.has(row.applId))) {
      this.loadDocPayDefaults();
      if (this.docPayDefaultsLoading || this.docPayDefaultsError) return;
    }
    this.clearSaveMessages();
    this.isSaving = true;
    this.rowRequiredValidationEnabled = true;
    this.restoreReadOnlyOefiaNotes();
    this.enforceDoNotPayRulesForRows(rowsToSave);
    const hasNoDoNotPayErrors = this.updateDoNotPayDocNotesValidationErrors();
    const hasNoMandatoryFieldErrors = this.updateMandatoryFieldValidationErrors();
    const hasNoRecommendationErrors = this.updateRecommendationValidationErrors();
    if (!hasNoDoNotPayErrors || !hasNoMandatoryFieldErrors || !hasNoRecommendationErrors) {
      this.isSaving = false;
      this.recomputeCanSave();
      this.dtElement?.dtInstance?.then(dt => dt.ajax.reload(null, false));
      return;
    }

    const readbacks = rowsToSave.map(row => this.createRowReadback(row, 'unknown'));
    this.fundingSaveSubscription = from(readbacks).pipe(
      concatMap((readback, index) => this.saveFundingRow(readback, readbacks.slice(index + 1))),
      takeWhile(result => result.proceed, true),
      toArray()
    ).subscribe({
      next: results => {
        if (!this.isCurrentFundingSave(readbacks[0])) return;
        this.isSaving = false;
        const outcomes = results.map(result => result.outcome).filter((outcome): outcome is BulkWriteOutcome => !!outcome);
        const failures = outcomes.filter(outcome => outcome.status !== 'saved');
        if (failures.length) {
          if (outcomes.length === 1 && failures[0].status === 'rejected' && !this.priorityRefreshRequired) {
            this.saveErrorMessage = failures[0].message;
          } else {
            this.bulkWriteOutcomeMessage = failures.map(outcome => {
              const row = this.rows.find(current => current.applId === outcome.applId);
              return `${row?.grantNumber ?? outcome.applId}: ${outcome.message}`;
            }).join(' ');
          }
        }
        this.recomputeCanSave();
        const savedCount = outcomes.filter(outcome => outcome.status === 'saved').length;
        if (savedCount && !this.savedChangesNeedRefresh) {
          this.saveSuccessMessage = !failures.length && !this.fundingRecoveryStates.size && !this.canSave
            ? 'Success! Bulk changes have been applied'
            : `Success! Changes were saved for ${savedCount} grant${savedCount === 1 ? '' : 's'}.`;
          if (this.canSave) this.saveSuccessMessage += ' Your newer edits have not been saved.';
        }
      }
    });
  }

  private saveFundingRow(
    readback: BulkRowReadback, remaining: BulkRowReadback[]
  ): Observable<{ proceed: boolean; outcome: BulkWriteOutcome | null }> {
    return defer(() => {
      if (!this.isCurrentFundingSave(readback)) return of({ proceed: false, outcome: null });
      const submitted = readback.submittedRow;
      const request = {
        applIds: [submitted.applId],
        fields: {
          budgetCategories: submitted.budgetCategories,
          docDecision: submitted.docDecision,
          docNciSelection: submitted.docNciSelection,
          annualFundingR01: submitted.annualFundingR01,
          annualOrMyf: submitted.annualOrMyf,
          docNotes: submitted.docNotes,
          oefiaNotes: submitted.oefiaNotes,
          docPriority: readback.transitionIntent || submitted.docPriority == null
            ? null : String(submitted.docPriority),
          docRecAmt: submitted.docRecAmt,
          docRecReductionPct: submitted.docRecReductionPct,
          recused: submitted.recused
        },
        ...(readback.transitionIntent ? { transitionIntents: [readback.transitionIntent] } : {})
      };
      let started = false;
      return defer(() => {
        this.fundingWriteRecovery.begin(readback.listId, submitted.applId);
        started = true;
        this.fundingRecoveryStates.set(submitted.applId, 'unknown');
        return this.fundingErrorScope.handleLocally(
          this.fundingSubmissionsService.bulkUpdateListGrants(request, readback.listId)
        );
      }).pipe(
        take(1),
        defaultIfEmpty(null),
        map(count => {
          if (count !== 1) throw new Error('The funding save returned an unexpected response.');
          this.fundingWriteRecovery.mark(readback.listId, submitted.applId, 'saved');
          readback.outcome = 'saved';
          if (this.isCurrentFundingSave(readback)) {
            this.fundingRecoveryStates.set(submitted.applId, 'saved');
            this.pendingFundingReadbacks.set(submitted.applId, readback);
          }
          const outcome: BulkWriteOutcome = { applId: submitted.applId, status: 'saved' };
          return outcome;
        }),
        catchError(error => of(this.handleRowWriteFailure(readback, error, started))),
        concatMap(outcome => {
          if (!this.isCurrentFundingSave(readback)
            || outcome.status === 'unknown' || outcome.status === 'not-sent') {
            return of({ proceed: false, outcome });
          }
          return this.refreshSavedFundingRequest(remaining).pipe(
            map(refreshed => ({ proceed: refreshed, outcome }))
          );
        })
      );
    });
  }

  private handleRowWriteFailure(readback: BulkRowReadback, error: unknown, started: boolean): BulkWriteOutcome {
    const applId = readback.submittedRow.applId;
    let status: BulkWriteOutcome['status'] = started ? 'unknown' : 'not-sent';
    let message = started
      ? 'Save outcome is unknown; do not retry until support confirms it is final.'
      : 'Save was not sent because recovery storage is unavailable.';
    try {
      if (!started) {
        const existing = this.fundingWriteRecovery.get(readback.listId, applId);
        if (existing && this.isCurrentFundingSave(readback)) {
          readback.outcome = existing.state;
          this.fundingRecoveryStates.set(applId, existing.state);
          if (existing.state === 'unknown') {
            this.unknownFundingReadbacks.set(applId, readback);
            message = 'A previous save has an unknown outcome; do not retry until support confirms it is final.';
          } else {
            this.pendingFundingReadbacks.set(applId, readback);
            message = 'A previous save must be refreshed and reviewed before saving again.';
          }
          this.logger.error('Bulk funding save was not sent because recovery is pending', error, { applId });
          return { applId, status, message };
        }
      } else if (typeof error === 'object' && error !== null && 'status' in error && error.status === 409) {
        this.fundingWriteRecovery.mark(readback.listId, applId, 'conflict');
        status = 'conflict';
        message = 'Server state changed; refresh and review before saving again.';
      } else if (isDefiniteFundingWriteRejection(error)) {
        this.fundingWriteRecovery.clear(readback.listId, applId);
        status = 'rejected';
        message = this.getSaveErrorMessage(error);
      }
    } catch (storageError) {
      status = 'unknown';
      message = 'Recovery state could not be updated; contact support before saving again.';
      this.logger.error('Unable to update bulk funding save recovery state', storageError);
      if (this.isCurrentFundingSave(readback)) this.fundingRecoveryError = message;
    }

    this.logger.error('Bulk funding save failed', error, { applId });
    if (this.isCurrentFundingSave(readback)) {
      if (status === 'conflict') {
        readback.outcome = 'conflict';
        this.fundingRecoveryStates.set(applId, 'conflict');
        this.pendingFundingReadbacks.set(applId, readback);
      } else if (status === 'unknown') {
        this.fundingRecoveryStates.set(applId, 'unknown');
        this.unknownFundingReadbacks.set(applId, readback);
      } else {
        this.fundingRecoveryStates.delete(applId);
        if (readback.outcome === 'saved') this.acknowledgedRows.add(applId);
        if (status === 'not-sent') this.fundingRecoveryError = message;
      }
    }
    return { applId, status, message };
  }

  private editableRowFromGrant(grant: FundingSubmissionListGrantDto): EditableBulkRow {
    return {
      ...grant,
      budgetCategories: grant.budgetCategoryCode ?? '',
      docDecision: grant.docDecision ?? '',
      docNciSelection: grant.docNciSelection ?? '',
      annualFundingR01: grant.annualFundingR01 === undefined
        ? (grant.twoYearAnnualFundingR01Flag ? 'Yes' : null)
        : grant.annualFundingR01,
      annualOrMyf: grant.annualOrMyf ?? '',
      docNotes: grant.docNotes ?? '',
      oefiaNotes: grant.oefiaNotes ?? '',
      docPriority: grant.docPriority ?? null,
      docRecAmt: grant.docRecommendedAmount ?? null,
      docRecReductionPct: grant.docRecommendedReductionPct ?? null,
      recused: grant.recusedFlag ? 'Y' : 'N'
    };
  }

  private cancelDocPayDefaults(): void {
    this.defaultsRequestVersion++;
    if (this.docPayDefaultsSubscription && !this.docPayDefaultsSubscription.closed) {
      this.docPayDefaultsSubscription.unsubscribe();
    }
    this.docPayDefaultsLoading = false;
    this.docPayDefaultsError = '';
    this.docPayDefaultsResolvedRows.clear();
  }

  private invalidateFundingRequests(): void {
    this.editVersion++;
    this.cancelDocPayDefaults();
    if (this.fundingReadbackSubscription && !this.fundingReadbackSubscription.closed) {
      this.fundingReadbackSubscription.unsubscribe();
    }
    this.pendingFundingReadbacks.clear();
    this.unknownFundingReadbacks.clear();
    this.priorityRefreshRequired = false;
    this.isSaving = false;
  }

  get technicalSupportMailto(): string {
    return technicalSupportMailto(this.propertiesService.getProperty('TECH_SUPPORT_EMAIL'));
  }

  private needsDocPayDefaults(row: EditableBulkRow): boolean {
    return this.isDoNotPayDecisionValue(this.getLastSavedRow(row)?.docDecision)
      && isPayDecision(row.docDecision, this.decisionOptions);
  }

  loadDocPayDefaults(): void {
    this.cancelDocPayDefaults();
    if (this.isSaving) return;
    const requestedRows = this.rows.filter(row => this.needsDocPayDefaults(row)
      && !this.fundingRecoveryStates.has(row.applId));
    if (!requestedRows.length) return;

    const listId = this.listId;
    const editVersion = this.editVersion;
    const requestVersion = this.defaultsRequestVersion;
    const requests = requestedRows.map(row => {
      const provenance = this.provenanceFor(row);
      if (!provenance.hasUserEdit('docPriority')) row.docPriority = null;
      provenance.preparePreview(row);
      return { row, fields: { ...row }, versions: provenance.snapshot() };
    });
    requestedRows.forEach(row => this.observedSelections.set(row.applId, { ...row }));
    const isCurrent = () => this.listId === listId && this.editVersion === editVersion
      && this.defaultsRequestVersion === requestVersion
      && requests.every(request => this.rows.includes(request.row) && this.needsDocPayDefaults(request.row));

    this.docPayDefaultsLoading = true;
    this.docPayDefaultsSubscription = this.fundingErrorScope.handleLocally(
      this.fundingSubmissionsService.getDocPayDefaults(listId, requestedRows.map(row => row.applId))
    ).pipe(
      defaultIfEmpty([]),
      map(defaults => requests.map(request => ({
        ...request,
        defaults: requireDocPayDefaults(defaults, request.row.applId)
      }))),
      take(1)
    ).subscribe({
      next: resolved => {
        if (!isCurrent()) return;
        for (const { row, fields, versions, defaults } of resolved) {
          const provenance = this.provenanceFor(row);
          const appliedPriority = applyDocPayDefaults(row, defaults, field =>
            row[field] === fields[field]
            && (field === 'docPriority'
              ? !provenance.hasUserEdit(field) && provenance.unchangedSince(field, versions)
              : provenance.mayApplyDefault(field, versions)));
          if (appliedPriority) provenance.markAutomaticPriorityApplied();
          const observed = this.observedSelections.get(row.applId);
          for (const field of DOC_PAY_SELECTION_FIELDS) observed[field] = row[field];
          this.docPayDefaultsResolvedRows.add(row.applId);
        }
        this.docPayDefaultsLoading = false;
        this.onRowFieldChange();
        this.dtElement?.dtInstance?.then(dt => dt.ajax.reload(null, false));
      },
      error: error => {
        if (!isCurrent()) return;
        this.docPayDefaultsLoading = false;
        if (error instanceof HttpErrorResponse) {
          this.docPayDefaultsError = DOC_PAY_DEFAULTS_LOOKUP_ERROR;
          this.logger.error('Failed to load DOC Pay defaults for bulk edit',
            docPayDefaultsLookupLogContext(error, listId, requestedRows.map(row => row.applId)));
        } else {
          this.docPayDefaultsError = this.getSaveErrorMessage(error);
          this.logger.error('Failed to load DOC Pay defaults for bulk edit', error);
        }
      }
    });
  }

  private createRowReadback(row: EditableBulkRow, outcome: FundingWriteRecoveryState): BulkRowReadback {
    return {
      listId: this.listId,
      editVersion: this.editVersion,
      rowsReference: this.rows,
      submittedRow: { ...row },
      baselineRow: { ...(this.getLastSavedRow(row) ?? row) },
      fieldVersions: this.provenanceFor(row).snapshot(),
      outcome,
      ...(this.needsDocPayDefaults(row) ? { transitionIntent: this.provenanceFor(row).intent(row.applId) } : {})
    };
  }

  private loadFundingRecoveryStates(): void {
    this.fundingRecoveryStates.clear();
    this.pendingFundingReadbacks.clear();
    this.unknownFundingReadbacks.clear();
    this.fundingRecoveryError = '';
    try {
      for (const row of this.rows) {
        const record = this.fundingWriteRecovery.get(this.listId, row.applId);
        if (!record) continue;
        this.fundingRecoveryStates.set(row.applId, record.state);
        const readback = this.createRowReadback(row, record.state);
        if (record.state === 'unknown') {
          this.unknownFundingReadbacks.set(row.applId, readback);
        } else {
          this.pendingFundingReadbacks.set(row.applId, readback);
        }
      }
    } catch (error) {
      this.fundingRecoveryError = this.getSaveErrorMessage(error);
      this.logger.error('Unable to load bulk funding save recovery state', error);
    }
    if (this.rowRequiredValidationEnabled) {
      this.updateDoNotPayDocNotesValidationErrors();
      this.updateMandatoryFieldValidationErrors();
      this.updateRecommendationValidationErrors();
    }
  }

  private isCurrentFundingSave(readback: BulkRowReadback): boolean {
    return this.listId === readback.listId && this.editVersion === readback.editVersion
      && this.rows === readback.rowsReference;
  }

  recoverUnknownRow(row: EditableBulkRow): void {
    if (this.fundingRecoveryStates.get(row.applId) !== 'unknown'
      || !this.confirmedUnknownRows[row.applId] || this.fundingRecoveryError) return;
    const readback = this.unknownFundingReadbacks.get(row.applId) ?? this.createRowReadback(row, 'unknown');
    readback.outcome = 'unknown';
    this.pendingFundingReadbacks.set(row.applId, readback);
    this.refreshSavedFunding();
  }

  refreshSavedFunding(): void {
    if (this.isSaving || (this.fundingReadbackSubscription && !this.fundingReadbackSubscription.closed)) return;
    const editVersion = this.editVersion;
    this.fundingReadbackSubscription = this.refreshSavedFundingRequest().subscribe(() => {
      if (this.editVersion === editVersion) this.isSaving = false;
    });
  }

  private refreshSavedFundingRequest(remaining: BulkRowReadback[] = []): Observable<boolean> {
    const listId = this.listId;
    const editVersion = this.editVersion;
    const rows = this.rows;
    const isCurrent = () => this.listId === listId && this.editVersion === editVersion && this.rows === rows;
    const readbacks = [...this.pendingFundingReadbacks.values()].filter(readback => this.isCurrentFundingSave(readback));
    this.priorityRefreshRequired = true;
    this.isSaving = true;
    this.saveErrorMessage = '';
    return this.fundingErrorScope.handleLocally(
      this.fundingSubmissionsService.getListDetail(this.listId)
    ).pipe(
      defaultIfEmpty(null),
      take(1),
      map(detail => {
        if (!isCurrent()) return false;
        if (!Array.isArray(detail?.grants) || this.rows.some(row =>
          !detail.grants.some(grant => grant.applId === row.applId))) {
          throw new Error('A grant was not present in the refreshed list.');
        }
        const errors: string[] = [];
        let savedCount = 0;
        let needsReview = false;
        for (const readback of readbacks) {
          const applId = readback.submittedRow.applId;
          if (!this.isCurrentFundingSave(readback) || this.pendingFundingReadbacks.get(applId) !== readback) continue;
          const grant = detail?.grants?.find(current => current.applId === applId);
          const row = this.rows.find(current => current.applId === applId);
          if (!grant || !row) {
            errors.push(`${row?.grantNumber ?? applId}: grant was not present in the refreshed list.`);
            continue;
          }
          try {
            this.fundingWriteRecovery.clear(readback.listId, applId);
          } catch (error) {
            errors.push(`${row.grantNumber ?? applId}: recovery state could not be cleared.`);
            this.logger.error('Unable to complete bulk funding save recovery', error, { applId });
            continue;
          }
          const persisted = this.editableRowFromGrant(grant);
          const provenance = this.provenanceFor(row);
          const newerFields: Record<string, unknown> = {};
          for (const field of BulkEditComponent.PERSISTED_FIELDS) {
            const changedSinceSubmit = row[field] !== readback.submittedRow[field]
              || !provenance.unchangedSince(field, readback.fieldVersions);
            const isDefaultField = [...DOC_PAY_SELECTION_FIELDS, 'docPriority', 'docRecAmt', 'docRecReductionPct']
              .includes(field as DocPayDefaultField);
            const changedBeforeSubmit = !provenance.unchangedSince(field, new Map())
              || (!isDefaultField && row[field] !== readback.baselineRow[field]);
            if (changedSinceSubmit || (readback.outcome !== 'saved' && changedBeforeSubmit)) {
              newerFields[field] = row[field];
            }
          }
          Object.assign(row, persisted, newerFields);
          this.provenanceByRow.set(applId, provenance.rebase(
            persisted, readback.fieldVersions, readback.outcome !== 'saved'
          ));
          const baselineIndex = this.lastSavedRows.findIndex(current => current.applId === applId);
          if (baselineIndex >= 0) this.lastSavedRows[baselineIndex] = { ...persisted };
          this.observedSelections.set(applId, { ...row });
          this.pendingFundingReadbacks.delete(applId);
          this.unknownFundingReadbacks.delete(applId);
          this.fundingRecoveryStates.delete(applId);
          delete this.confirmedUnknownRows[applId];
          this.acknowledgedRows.add(applId);
          if (readback.outcome === 'saved') savedCount++;
          else needsReview = true;
        }
        for (const row of this.rows as EditableBulkRow[]) {
          if (readbacks.some(readback => readback.submittedRow.applId === row.applId)) continue;
          const priority = detail.grants.find(grant => grant.applId === row.applId).docPriority ?? null;
          const baseline = this.getLastSavedRow(row);
          const provenance = this.provenanceFor(row);
          const automaticPreview = this.needsDocPayDefaults(row)
            && provenance.intent(row.applId).priorityMode === 'AUTO';
          const untouched = !provenance.hasUserEdit('docPriority')
            && (automaticPreview || String(row.docPriority ?? '') === String(baseline?.docPriority ?? ''));
          if (untouched && !automaticPreview) row.docPriority = priority;
          if (baseline) baseline.docPriority = priority;
          for (const queued of remaining.filter(item => item.submittedRow.applId === row.applId)) {
            if (String(queued.submittedRow.docPriority ?? '') === String(queued.baselineRow.docPriority ?? '')) {
              queued.submittedRow.docPriority = priority;
            }
            queued.baselineRow.docPriority = priority;
          }
        }
        this.priorityRefreshRequired = errors.length > 0;
        if (!errors.length && !this.savedChangesNeedRefresh) {
          this.bulkDoNotPayWithBlankDocNotesApplied = false;
        }
        this.updateDoNotPayDocNotesValidationErrors();
        if (this.rowRequiredValidationEnabled) {
          this.updateMandatoryFieldValidationErrors();
          this.updateRecommendationValidationErrors();
        }
        this.recomputeCanSave();
        if (savedCount) {
          this.saveSuccessMessage = !errors.length && !this.savedChangesNeedRefresh && !this.bulkWriteOutcomeMessage
            && !this.fundingRecoveryStates.size && !this.canSave
            ? 'Success! Bulk changes have been applied'
            : `Success! Changes were saved for ${savedCount} grant${savedCount === 1 ? '' : 's'}.`;
          if (this.canSave) this.saveSuccessMessage += ' Your newer edits have not been saved.';
          this.scrollToSuccessMessage();
        }
        if (needsReview) {
          this.bulkWriteOutcomeMessage += ' Server values were refreshed; review unsaved changes before saving.';
        }
        if (errors.length) {
          const prefix = readbacks.length && readbacks.every(readback => readback.outcome === 'saved')
            ? 'Bulk changes were saved, but some values could not be refreshed.'
            : 'Some grant values could not be refreshed.';
          this.saveErrorMessage = `${prefix} ${errors.join(' ')} Retry refresh.`;
        }
        this.dtElement?.dtInstance?.then(dt => dt.ajax.reload(null, false));
        return !errors.length;
      }),
      catchError(error => {
        if (!isCurrent()) return of(false);
        this.saveErrorMessage = readbacks.length && readbacks.every(readback => readback.outcome === 'saved')
          ? 'Bulk changes were saved, but the saved values could not be refreshed. Retry refresh before saving those grants again.'
          : 'Some grant changes could not be refreshed. Retry refresh before saving those grants again.';
        this.logger.error('Failed to refresh saved bulk changes', error);
        this.recomputeCanSave();
        return of(false);
      })
    );
  }

  private scrollToSuccessMessage(): void {
    // Wait for *ngIf to render the alert, then move viewport and focus for accessibility.
    setTimeout(() => {
      const alertEl = this.saveSuccessAlert?.nativeElement;
      if (!alertEl) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      alertEl.focus({ preventScroll: true });
    }, 0);
  }

  goBack(): void {
    const queryParams: any = { listId: this.listId, selectionDate: this.selectionDate };
    if (this.fromRoute) {
      queryParams.from = this.fromRoute;
    }
    this.router.navigate(['/funding-submissions/search'], {
      queryParams,
      state: {
        selectionListId: this.listId,
        selectedApplIds: this.rows.map(row => row.applId)
      }
    });
  }

  onBackToListClick(): void {
    if (!this.canSave) {
      this.goBack();
      return;
    }
    this.modalRef = this.modalService.open(this.backToListWarningModalRef, { centered: true });
  }

  onCancelNavigation(): void {
    this.modalRef?.dismiss();
  }

  onConfirmNavigation(): void {
    this.onReset();
    this.modalRef?.close();
    this.goBack();
  }
}
