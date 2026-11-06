import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { forkJoin, map, Subject, Subscription, take } from 'rxjs';
import { FundingSubmissionsService, FundingSubmBulkEditFieldsDto, FundingSubmissionListGrantDto } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { Select2OptionData } from 'ng-select2';
import { DataTableDirective } from 'angular-datatables';
import { FullGrantNumberCellRendererComponent } from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { logger } from 'codelyzer/util/logger';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { roleNames } from '../../../service/role-names';
import { applyDocPayDefaults, DOC_PAY_SELECTION_FIELDS, DocPaySelectionField, DocPaySelections, isBlankSelection, isPayDecision, requireDocPayDefaults } from '../../doc-pay-defaults';

type EditableBulkRow = Omit<FundingSubmissionListGrantDto, 'docPriority'>
  & Omit<FundingSubmBulkEditFieldsDto, 'docPriority'> & { docPriority?: string | number };

interface BulkSaveReadback {
  listId: number;
  editVersion: number;
  rowsReference: EditableBulkRow[];
  submittedRows: EditableBulkRow[];
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
  docFundingListCor = false;
  OEFIACertifier = false;
  private lastSavedRows: any[] = [];
  private pendingRealignFrame: number | null = null;
  private readonly doNotPayDocNotesErrorMessage = 'DOC Notes is required when DOC decision is Do Not Pay.';
  private doNotPayDocNotesErrorRowIds = new Set<number>();
  private mandatoryFieldErrorRowMap = new Map<number, Set<string>>();
  private rowRequiredValidationEnabled = false;
  private bulkFieldsApplied = false;
  private bulkDoNotPayWithBlankDocNotesApplied = false;
  docPayDefaultsLoading = false;
  docPayDefaultsError = '';
  private docPayDefaultsSubscription: Subscription;
  private fundingReadbackSubscription: Subscription;
  private fundingSaveSubscription: Subscription;
  private pendingFundingReadback: BulkSaveReadback;
  private editVersion = 0;
  private defaultsRequestVersion = 0;
  private docPayDefaultsResolvedRows = new Set<number>();
  private selectionVersions = new Map<number, Map<DocPaySelectionField, number>>();
  private observedSelections = new Map<number, DocPaySelections>();

  get savedChangesNeedRefresh(): boolean {
    return !!this.pendingFundingReadback;
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

  get showBulkDoNotPayDocNotesError(): boolean {
    return !this.isDocOnlyUser()
      && this.bulkDoNotPayWithBlankDocNotesApplied
      && this.hasDoNotPayDocNotesErrors;
  }

  // Populated from the shared FundingSubmDropdownLookupService (2026-08-24 Individual/Bulk Edit
  // dropdown consistency fix) so this screen and Individual Edit always use the same value
  // lists. Initialized empty and populated in ngOnInit(); see fetchDropdownOptions().
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
    private userSessionService: AppUserSessionService
  ) {}

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
    this.rows.forEach(row => this.observedSelections.set(row.applId, { ...row }));
    this.lastSavedRows = JSON.parse(JSON.stringify(this.rows));
    this.logger.debug(JSON.stringify(this.rows));
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
    this.canSave = this.rows.some(row => this.isRowDirty(row));
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

      if (f.budgetCategories) row.budgetCategories = f.budgetCategories;
      if (f.docDecision && !skipRowDoNotPay) row.docDecision = f.docDecision;
      if (f.docNciSelection) row.docNciSelection = f.docNciSelection;
      if (f.annualFundingR01) row.annualFundingR01 = f.annualFundingR01;
      if (f.annualOrMyf) row.annualOrMyf = f.annualOrMyf;
      if (f.docNotes && !skipRowDoNotPay) row.docNotes = f.docNotes;
      if (this.canEditOefiaNotes() && f.oefiaNotes) row.oefiaNotes = f.oefiaNotes;
      if (!skipRowDoNotPay && this.isDoNotPayDecisionValue(row.docDecision)) {
        this.clearDoNotPayDependentFields(row);
      }
    }

    this.restoreReadOnlyOefiaNotes();
    this.loadDocPayDefaults();
    this.bulkFieldsApplied = true;
    this.updateDoNotPayDocNotesValidationErrors();
    if (this.rowRequiredValidationEnabled) {
      this.updateMandatoryFieldValidationErrors();
    }
    // Apply Changes only enables Save when it actually changed at least one row's persisted
    // value; it must not leave a stale canSave=true when the shared values matched every row.
    this.recomputeCanSave();
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
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

  private enforceDoNotPayRulesForRows(): void {
    this.rows.forEach(row => {
      if (this.isDoNotPayDecisionValue(row.docDecision)) {
        this.clearDoNotPayDependentFields(row);
      }
    });
  }

  private updateDoNotPayDocNotesValidationErrors(): boolean {
    this.doNotPayDocNotesErrorRowIds.clear();
    this.rows.forEach(row => {
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
      const versions = this.selectionVersions.get(row.applId) ?? new Map<DocPaySelectionField, number>();
      if (row[field] !== observed[field]) {
        versions.set(field, (versions.get(field) ?? 0) + 1);
        observed[field] = row[field];
      }
      this.observedSelections.set(row.applId, observed);
      this.selectionVersions.set(row.applId, versions);
    }
    this.restoreReadOnlyOefiaNotes();
    this.updateDoNotPayDocNotesValidationErrors();
    if (this.rowRequiredValidationEnabled) {
      this.updateMandatoryFieldValidationErrors();
    }
    this.recomputeCanSave();
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
    if (this.pendingFundingReadback) return;
    this.invalidateFundingRequests();
    this.selectionVersions.clear();
    this.bulkForm?.resetForm();
    this.bulkFields = {};
    this.bulkFieldsApplied = false;
    this.bulkDoNotPayWithBlankDocNotesApplied = false;
    this.rows = JSON.parse(JSON.stringify(this.lastSavedRows));
    this.rows.forEach(row => this.observedSelections.set(row.applId, { ...row }));
    this.doNotPayDocNotesErrorRowIds.clear();
    this.mandatoryFieldErrorRowMap.clear();
    this.rowRequiredValidationEnabled = false;
    this.canSave = false;
    this.clearSaveMessages();
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }

  onSave(): void {
    if (!this.rows.length || !this.canSave || this.isSaving || this.docPayDefaultsLoading
      || this.docPayDefaultsError || this.pendingFundingReadback) return;
    if (this.rows.some(row => this.needsDocPayDefaults(row) && !this.docPayDefaultsResolvedRows.has(row.applId))) {
      this.loadDocPayDefaults();
      if (this.docPayDefaultsLoading || this.docPayDefaultsError) return;
    }
    this.clearSaveMessages();
    this.isSaving = true;
    this.rowRequiredValidationEnabled = true;
    this.restoreReadOnlyOefiaNotes();
    this.enforceDoNotPayRulesForRows();
    const hasNoDoNotPayErrors = this.updateDoNotPayDocNotesValidationErrors();
    const hasNoMandatoryFieldErrors = this.updateMandatoryFieldValidationErrors();
    if (!hasNoDoNotPayErrors || !hasNoMandatoryFieldErrors) {
      this.isSaving = false;
      this.recomputeCanSave();
      this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
      return;
    }

    const readback: BulkSaveReadback = {
      listId: this.listId,
      editVersion: this.editVersion,
      rowsReference: this.rows,
      submittedRows: JSON.parse(JSON.stringify(this.rows))
    };
    const calls = readback.submittedRows.map(row =>
      this.fundingSubmissionsService.bulkUpdateListGrants(
        {
          applIds: [row.applId],
          fields: {
            budgetCategories: row.budgetCategories,
            docDecision:      row.docDecision,
            docNciSelection:  row.docNciSelection,
            annualFundingR01: row.annualFundingR01,
            annualOrMyf:      row.annualOrMyf,
            docNotes:         row.docNotes,
            oefiaNotes:       row.oefiaNotes,
            // Not editable from this screen, but must be round-tripped — the backend does a
            // full-overwrite of every field on this DTO, so omitting these would silently wipe
            // them (see the comment in ngOnInit()'s row mapping above).
            docPriority:        row.docPriority == null ? null : String(row.docPriority),
            docRecAmt:          row.docRecAmt,
            docRecReductionPct: row.docRecReductionPct,
            recused:            row.recused,
          }
        },
        this.listId
      )
    );
    this.fundingSaveSubscription = forkJoin(calls).subscribe({
      next: () => {
        if (!this.isCurrentFundingSave(readback)) return;
        this.logger.debug('Bulk edit saved successfully');
        this.pendingFundingReadback = readback;
        this.refreshSavedFunding();
      },
      error: (err) => {
        if (!this.isCurrentFundingSave(readback)) return;
        this.isSaving = false;
        this.saveErrorMessage = this.getSaveErrorMessage(err);
        this.logger.error('Bulk edit save failed', err);
      }
    });
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
    this.pendingFundingReadback = undefined;
    this.isSaving = false;
  }

  private needsDocPayDefaults(row: EditableBulkRow): boolean {
    return this.docFundingListCor && this.isDoNotPayDecisionValue(this.getLastSavedRow(row)?.docDecision)
      && isPayDecision(row.docDecision, this.decisionOptions);
  }

  loadDocPayDefaults(): void {
    this.cancelDocPayDefaults();
    if (this.isSaving || this.pendingFundingReadback) return;
    const requestedRows = this.rows.filter(row => this.needsDocPayDefaults(row));
    if (!requestedRows.length) return;

    const listId = this.listId;
    const editVersion = this.editVersion;
    const requestVersion = this.defaultsRequestVersion;
    const requests = requestedRows.map(row => ({
      row,
      fields: { ...row },
      versions: new Map(this.selectionVersions.get(row.applId))
    }));
    requestedRows.forEach(row => this.observedSelections.set(row.applId, { ...row }));
    const isCurrent = () => this.listId === listId && this.editVersion === editVersion
      && this.defaultsRequestVersion === requestVersion
      && requests.every(request => this.rows.includes(request.row) && this.needsDocPayDefaults(request.row));

    this.docPayDefaultsLoading = true;
    this.docPayDefaultsSubscription = this.fundingSubmissionsService.getDocPayDefaults(
      listId, requestedRows.map(row => row.applId)
    ).pipe(
      map(defaults => requests.map(request => ({
        ...request,
        defaults: requireDocPayDefaults(defaults, request.row.applId)
      }))),
      take(1)
    ).subscribe({
      next: resolved => {
        if (!isCurrent()) return;
        for (const { row, fields, versions, defaults } of resolved) {
          applyDocPayDefaults(row, defaults, field =>
            row[field] === fields[field]
            && (this.selectionVersions.get(row.applId)?.get(field) ?? 0) === (versions.get(field) ?? 0));
          const observed = this.observedSelections.get(row.applId);
          for (const field of DOC_PAY_SELECTION_FIELDS) observed[field] = row[field];
          this.docPayDefaultsResolvedRows.add(row.applId);
        }
        this.docPayDefaultsLoading = false;
        this.onRowFieldChange();
        this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
      },
      error: error => {
        if (!isCurrent()) return;
        this.docPayDefaultsLoading = false;
        this.docPayDefaultsError = this.getSaveErrorMessage(error);
        this.logger.error('Failed to load DOC Pay defaults for bulk edit', error);
      }
    });
  }

  private isCurrentFundingSave(readback: BulkSaveReadback): boolean {
    return this.listId === readback.listId && this.editVersion === readback.editVersion
      && this.rows === readback.rowsReference;
  }

  refreshSavedFunding(): void {
    const readback = this.pendingFundingReadback;
    if (!readback || !this.isCurrentFundingSave(readback)
      || (this.fundingReadbackSubscription && !this.fundingReadbackSubscription.closed)) return;
    this.isSaving = true;
    this.saveErrorMessage = '';
    this.fundingReadbackSubscription = this.fundingSubmissionsService.getListDetail(readback.listId).pipe(
      map(detail => readback.submittedRows.map(submitted => {
        const grant = detail.grants?.find(row => row.applId === submitted.applId);
        if (!grant) throw new Error('A saved grant is not present in the refreshed list.');
        return this.editableRowFromGrant(grant);
      })),
      take(1)
    ).subscribe({
      next: persistedRows => {
        if (!this.isCurrentFundingSave(readback) || this.pendingFundingReadback !== readback) return;
        for (const persisted of persistedRows) {
          const row = this.rows.find(current => current.applId === persisted.applId);
          const submitted = readback.submittedRows.find(current => current.applId === persisted.applId);
          const newerFields: Record<string, unknown> = {};
          for (const field of BulkEditComponent.PERSISTED_FIELDS) {
            if (row[field] !== submitted[field]) newerFields[field] = row[field];
          }
          Object.assign(row, persisted, newerFields);
        }
        this.lastSavedRows = JSON.parse(JSON.stringify(persistedRows));
        this.pendingFundingReadback = undefined;
        this.bulkDoNotPayWithBlankDocNotesApplied = false;
        this.mandatoryFieldErrorRowMap.clear();
        this.rowRequiredValidationEnabled = false;
        this.recomputeCanSave();
        this.saveSuccessMessage = 'Success! Bulk changes have been applied';
        if (this.canSave) this.saveSuccessMessage += ' Your newer edits have not been saved.';
        this.isSaving = false;
        this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
        this.scrollToSuccessMessage();
      },
      error: error => {
        if (!this.isCurrentFundingSave(readback) || this.pendingFundingReadback !== readback) return;
        this.isSaving = false;
        this.saveErrorMessage = 'Bulk changes were saved, but the saved values could not be refreshed. Retry refresh before saving again.';
        this.logger.error('Failed to refresh saved bulk changes', error);
      }
    });
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
