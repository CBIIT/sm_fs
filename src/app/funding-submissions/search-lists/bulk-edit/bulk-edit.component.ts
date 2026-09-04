import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { forkJoin, Subject } from 'rxjs';
import { FundingSubmissionsService, FundingSubmBulkEditFieldsDto } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { Select2OptionData } from 'ng-select2';
import { DataTableDirective } from 'angular-datatables';
import { FullGrantNumberCellRendererComponent } from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { logger } from 'codelyzer/util/logger';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';


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
  @ViewChild('bulkForm') bulkForm: NgForm;

  private modalRef: NgbModalRef;

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
  saveSuccessMessage = '';
  private lastSavedRows: any[] = [];
  private pendingRealignFrame: number | null = null;

  get hasAnyBulkFieldValue(): boolean {
    const f = this.bulkFields;
    return !!(f.budgetCategories || f.docDecision || f.docNciSelection ||
              f.annualFundingR01 || f.annualOrMyf || f.docNotes || f.oefiaNotes);
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
    private dropdownLookupService: FundingSubmDropdownLookupService
  ) {}

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl     = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL         = this.propertiesService.getProperty('I2EWEB_URL').trim();
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
    this.rows = grants.map(g => ({
      ...g,
      budgetCategories: g.budgetCategoryCode ?? '',
      docDecision:      g.docDecision ?? '',
      docNciSelection:  g.docNciSelection ?? '',
      annualFundingR01: g.twoYearAnnualFundingR01Flag ? 'Yes' : null,
      annualOrMyf:      g.annualOrMyf ?? '',
      docNotes:         g.docNotes ?? '',
      oefiaNotes:       g.oefiaNotes ?? '',
      docPriority:      g.docPriority ?? null,
      docRecAmt:            g.docRecommendedAmount ?? null,
      docRecReductionPct:   g.docRecommendedReductionPct ?? null,
      recused:          g.recusedFlag ? 'Y' : 'N',
    }));
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
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 25,
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
      columns: [
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '140px',
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
        {
          title: 'OEFIA Notes',
          data: 'oefiaNotes',
          width: '220px',
          defaultContent: '',
          ngTemplateRef: { ref: this.oefiaNotesRenderer }
        }, // 8
      ],
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

  // Called from the per-row DataTable cell renderers (bulk-edit.component.html) whenever a
  // grant row's field is edited directly, so "Save" enables even without going through the
  // shared "Apply Changes" flow.
  onRowFieldChange(): void {
    this.canSave = true;
  }

  onApplyChanges(): void {
    const f = this.bulkFields;
    for (const row of this.rows) {
      if (f.budgetCategories) row.budgetCategories = f.budgetCategories;
      if (f.docDecision)      row.docDecision      = f.docDecision;
      if (f.docNciSelection)  row.docNciSelection  = f.docNciSelection;
      if (f.annualFundingR01) row.annualFundingR01  = f.annualFundingR01;
      if (f.annualOrMyf)      row.annualOrMyf      = f.annualOrMyf;
      if (f.docNotes)         row.docNotes         = f.docNotes;
      if (f.oefiaNotes)       row.oefiaNotes       = f.oefiaNotes;
    }
    this.canSave = true;
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }

  onReset(): void {
    this.bulkForm?.resetForm();
    this.bulkFields = {};
    this.rows = JSON.parse(JSON.stringify(this.lastSavedRows));
    this.canSave = false;
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }

  onSave(): void {
    if (!this.rows.length) return;
    const calls = this.rows.map(row =>
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
            docPriority:        row.docPriority,
            docRecAmt:          row.docRecAmt,
            docRecReductionPct: row.docRecReductionPct,
            recused:            row.recused,
          }
        },
        this.listId
      )
    );
    forkJoin(calls).subscribe({
      next: () => {
        this.logger.debug('Bulk edit saved successfully');
        this.lastSavedRows = JSON.parse(JSON.stringify(this.rows));
        this.canSave = false;
        this.saveSuccessMessage = 'Success! Bulk changes have been applied';
      },
      error: (err) => this.logger.error('Bulk edit save failed', err)
    });
  }

  goBack(): void {
    const queryParams: any = { listId: this.listId, selectionDate: this.selectionDate };
    if (this.fromRoute) {
      queryParams.from = this.fromRoute;
    }
    this.router.navigate(['/funding-submissions/search'], {
      queryParams
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
