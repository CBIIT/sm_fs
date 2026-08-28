import { AfterViewInit, ChangeDetectorRef, Component, EnvironmentInjector, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, createComponent } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable, Subject, forkJoin } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { GrantDetailComponent } from './grant-detail/grant-detail.component';
import { Select2OptionData } from 'ng-select2';
import { FundingSubmissionsService, FundingSubmissionListGrantDto } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { DatatableThrottle } from '../../utils/datatable-throttle';
import { openNewWindow } from '../../utils/utils';
import { FoaCellRendererComponent } from '../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import { FullGrantNumberCellRendererComponent } from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { HttpClient } from '@angular/common/http';
import { FundingSubmDropdownLookupService } from '../funding-subm-dropdown-lookup.service';

declare var $: any;

@Component({
  selector: 'app-search-lists',
  templateUrl: './search-lists.component.html',
  styleUrls: ['./search-lists.component.css']
})
export class SearchListsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('foaCellRender') foaCellRender: TemplateRef<FoaCellRendererComponent>;
  @ViewChild('removeGrantsWarningModal') private removeGrantsWarningModalRef: TemplateRef<any>;
  @ViewChild('unsavedChangesWarningModal') private unsavedChangesWarningModalRef: TemplateRef<any>;

  private removeModalRef: NgbModalRef;
  private unsavedWarningModalRef: NgbModalRef;
  private pendingGuardedAction: (() => void) | null = null;
  private pendingGuardCancelAction: (() => void) | null = null;
  private pendingRouteLeaveDecision: ((allow: boolean) => void) | null = null;
  readonly unsavedChangesWarningMessage = 'Are you sure you want to navigate away from funding submissions edits? All unsaved changes will be lost.';
  private detailComponentsByApplId = new Map<number, any>();
  private tableGuardContainerEl: HTMLElement | null = null;
  private tableGuardCaptureHandler: ((event: Event) => void) | null = null;
  private globalAnchorGuardCaptureHandler: ((event: MouseEvent) => void) | null = null;
  private pendingRealignFrame: number | null = null;
  private readonly tablePageIntentSelector = '.dataTables_paginate .paginate_button, .dataTables_paginate .page-item, .dataTables_paginate a.page-link, .dt-paging-button';
  private readonly tableSortIntentSelector = 'thead th.sorting, thead th.sorting_asc, thead th.sorting_desc';

  i2eURL = '';
  grantViewerUrl = '';
  eGrantsUrl = '';
  documentURL = '';

  selectionDate = '';
  listId = 0;
  listStatus = '';
  backLabel = 'Back to Search Results';
  backRoute = '/funding-submissions/create';
  totalGrants = 0;
  docRecommendedTotal = 0;

  docStatusColumns: any[][] = [];
  listHistory: any[] = [];

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  throttle: DatatableThrottle = new DatatableThrottle();

  selectedViewDoc: string = null;
  selectedRows = new Map<number, any>();
  filteredDoc: string | null = null;
  private cachedGrants: FundingSubmissionListGrantDto[] = [];
  viewDocOptions: Select2OptionData[] = [
    { id: 'AB', text: 'Abstract(s)' },
    { id: 'SS', text: 'Summary Statement(s)' },
    { id: 'both', text: 'Abstract(s) and Summary Statement(s)' },
  ];

  // Display CODE vs NAME Reconciliation (2026-08-25): docDecision CODE → NAME lookup map,
  // built once from FundingSubmDropdownLookupService's cached options (shared with Individual
  // Edit / Bulk Edit, not a second/duplicate lookup-fetching mechanism). Populated in
  // ngOnInit(); see resolveDocDecisionDisplay(). Future-proofing only — docDecision's mock data
  // currently defines CODE and NAME as the same literal string, so this map has no live-visible
  // effect today, but protects the grid if a real lookup table is ever introduced.
  private docDecisionDisplayMap = new Map<string, string>();

  constructor(
    private loaderService: LoaderService,
    private route: ActivatedRoute,
    private router: Router,
    private logger: NGXLogger,
    private environmentInjector: EnvironmentInjector,
    private propertiesService: AppPropertiesService,
    private cdr: ChangeDetectorRef,
    private fundingSubmissionsService: FundingSubmissionsService,
    private http: HttpClient,
    private modalService: NgbModal,
    private dropdownLookupService: FundingSubmDropdownLookupService
  ) { }

  ngOnInit(): void {
    this.bindGlobalNavigationUnsavedGuard();
    this.dropdownLookupService.getDocDecisions().subscribe({
      next: options => {
        this.docDecisionDisplayMap = new Map(options.map(option => [String(option.id), option.text]));
        if (this.dtElement?.dtInstance) {
          this.dtElement.dtInstance.then(dtInstance => dtInstance.rows().invalidate().draw(false));
        }
      },
      error: err => this.logger.error('Failed to load DOC Decision options', err)
    });
    this.route.queryParams.subscribe(params => {
      if (params['listId']) {
        this.listId = Number(params['listId']);
        this.loadListMeta();
      }
      if (params['selectionDate']) {
        this.selectionDate = params['selectionDate'];
      }
      if (params['from'] === 'lists') {
        this.backLabel = 'Back to Search List View';
        this.backRoute = '/funding-submissions/lists';
      } else {
        this.backLabel = 'Back to Search Results';
        this.backRoute = '/funding-submissions/create';
      }
    });
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = this.propertiesService.getProperty('I2EWEB_URL').trim();
    // TODO remove the card coded URL when property added to the service
    this.documentURL = (this.propertiesService.getProperty('DOCVIEWER_URL') || '').trim();
  }

  get canViewPdf(): boolean {
    return this.selectedRows.size > 0 && !!this.selectedViewDoc;
  }

  // ng-select2 fires its change via a jQuery-triggered event, not a template-bound
  // Angular output, so the disabled-state binding on the View PDF button won't
  // refresh unless we force change detection here.
  onViewDocChange(value: string | string[]): void {
    this.selectedViewDoc = Array.isArray(value) ? value[0] : value;
    this.cdr.markForCheck();
  }

  viewPDF(): void {
    const applIds = Array.from(this.selectedRows.keys()).join(',');
    openNewWindow(`${this.documentURL}openGrantReport.action?docType=${this.selectedViewDoc}&applIds=${applIds}&resubmit=true`, 'session');
  }

  private loadListMeta(): void {
    forkJoin({
      detail: this.fundingSubmissionsService.getListDetail(this.listId),
      history: this.fundingSubmissionsService.getListStatusHistory(this.listId)
    }).subscribe({
      next: ({ detail, history }) => {
        this.selectionDate = detail.listCode || this.selectionDate;
        this.listStatus = detail.currentStatusDescrip || '';
        this.totalGrants = detail.totalGrants ?? 0;
        this.docRecommendedTotal = detail.totalDocRecAmt ?? 0;
        this.cachedGrants = detail.grants || [];
        this.docStatusColumns = this.buildDocStatusColumns(this.cachedGrants);
        this.listHistory = history;
        this.logger.debug('List detail:', detail);
        this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
      },
      error: (err) => this.logger.error('Failed to load list detail', err)
    });
  }

  private buildDocStatusColumns(grants: FundingSubmissionListGrantDto[]): any[][] {
    const docMap = new Map<string, { doc: string; count: number; docDecided: number; nciDecided: number }>();
    for (const g of grants) {
      const doc = g.doc || 'Unknown';
      if (!docMap.has(doc)) docMap.set(doc, { doc, count: 0, docDecided: 0, nciDecided: 0 });
      const entry = docMap.get(doc);
      entry.count++;
      if (g.docDecision) entry.docDecided++;
      if (g.nciDecision) entry.nciDecided++;
    }
    const items = Array.from(docMap.values()).map(e => ({
      doc: e.doc,
      count: e.count,
      status: this.deriveDocReviewStatus(e.count, e.docDecided, e.nciDecided)
    }));
    const columns: any[][] = [];
    for (let i = 0; i < items.length; i += 4) {
      columns.push(items.slice(i, i + 4));
    }
    return columns;
  }

  // Maps grant decision counts for a DOC to the 4 statuses the Review Status section supports
  private deriveDocReviewStatus(count: number, docDecided: number, nciDecided: number): string {
    if (this.listStatus?.toLowerCase() === 'draft') return 'Draft';
    if (docDecided < count) return 'Under DOC Review';
    if (nciDecided === 0) return 'Under Review';
    return 'Under NCI Director Review';
  }

  private readonly docStatusIcons: Record<string, string> = {
    'Draft': 'fa-hourglass-half',
    'Under DOC Review': 'fa-user-clock',
    'Under Review': 'fa-sync-alt',
    'Under NCI Director Review': 'fa-gavel'
  };

  getDocStatusIcon(status: string): string {
    return this.docStatusIcons[status] || 'fa-hourglass-half';
  }

  getDocStatusClass(status: string): string {
    return 'status-' + (status || '').toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Display CODE vs NAME Reconciliation (2026-08-25): resolves a raw docDecision CODE to its
   * human-readable NAME via docDecisionDisplayMap (built from FundingSubmDropdownLookupService's
   * docDecision options), falling back to the raw code if no match is found so an unrecognized
   * value never throws or renders blank.
   */
  private resolveDocDecisionDisplay(code: string): string {
    if (!code) {
      return '';
    }
    return this.docDecisionDisplayMap.get(code) ?? code;
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: false,
      processing: false,
      ajax: (dataTablesParameters: any, callback) => {
        this.throttle.invoke(this, dataTablesParameters, callback, this.ajaxCall);
      },
      scrollX: true,
      autoWidth: false,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" title="Last"></i>'
        }
      },
      columns: [
        {
          title: '',
          data: 'applId',
          orderable: false,
          width: '30px',
          className: 'all select-checkbox',
          render: () => ''
        }, // 0
        {
          title: 'Abs',
          data: 'abstractAvailable',
          width: '40px',
          defaultContent: '',
          render: (data: boolean) => data ? 'Y' : ''
        }, // 1
        {
          title: 'SS',
          data: 'summaryStatementAvailable',
          width: '40px',
          defaultContent: '',
          render: (data: boolean) => data ? 'Y' : ''
        }, // 2
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '140px',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer },
          className: 'all'
        }, // 3
        {
          title: 'DOC',
          data: 'doc',
          width: '50px',
          defaultContent: ''
        }, // 4
        {
          title: 'Budget Categories',
          data: 'budgetCategories',
          width: '110px',
          defaultContent: ''
        }, // 5
        {
          title: 'PI',
          data: 'piName',
          width: '130px',
          render: (data: string, _t: any, row: any) => data ? `<a href="mailto:${row.piEmail}?subject=${row.grantNumber} - ${row.piName}">${data}</a>` : ''
        }, // 6
        {
          title: 'IMPAC II Status',
          data: 'impacStatusDescrip',
          width: '100px',
          defaultContent: ''
        }, // 7
        {
          title: 'NCAB',
          data: 'ncabDate',
          width: '70px',
          defaultContent: '',
          render: (data: any, type: any) => {
            if (!data) return '';
            const d = new Date(data);
            return isNaN(d.getTime()) ? data : `${d.getMonth() + 1}/${d.getFullYear()}`;
          }
        }, // 8
        {
          title: 'Pctl',
          data: 'percentile',
          width: '50px',
          defaultContent: '',
          render: (data: number) => data != null ? `${data}%` : ''
        }, // 9
        {
          title: 'PriScr',
          data: 'priorityScoreDisplay',
          width: '90px',
          defaultContent: ''
        }, // 10
        {
          title: 'ESI',
          data: 'esiFlag',
          width: '50px',
          render: (data: boolean) => data === true ? 'Yes' : data === false ? 'No' : ''
        }, // 11
        {
          title: 'Application TC Est',
          data: 'applicationTotalCostEstimate',
          width: '110px',
          defaultContent: ''
        }, // 12
        {
          title: 'NCI Decision',
          data: 'nciDecision',
          width: '90px',
          defaultContent: ''
        }, // 13
        {
          title: 'DOC Decision',
          data: 'docDecision',
          width: '90px',
          defaultContent: '',
          render: (data: string) => this.resolveDocDecisionDisplay(data)
        }, // 14
        {
          title: 'DOC Priority',
          data: 'docPriority',
          width: '80px',
          defaultContent: ''
        }, // 15
        {
          title: 'DOC Rec. $',
          data: 'docRecommendedAmount',
          width: '90px',
          defaultContent: '',
          render: (data: number) => data != null ? '$' + Number(data).toLocaleString('en-US') : ''
        }, // 16
        {
          title: 'DOC Rec. % Red.',
          data: 'docRecommendedReductionPct',
          width: '95px',
          defaultContent: '',
          render: (data: number) => data != null ? `${data}%` : ''
        }, // 17
        {
          title: 'DOC/NCI Sel',
          data: 'docNciSelectionName',
          width: '100px',
          defaultContent: ''
        }, // 18
        {
          title: 'Two-Year Annual Funding R01 (HRHR)?',
          data: 'twoYearAnnualFundingR01Flag',
          width: '160px',
          defaultContent: '',
          render: (data: any) => data ? 'Y' : ''
        }, // 19
        {
          title: 'Annual or MYF',
          data: 'annualOrMyfName',
          width: '90px',
          defaultContent: ''
        }, // 20
        {
          title: 'Recused',
          data: 'recusedFlag',
          width: '70px',
          defaultContent: '',
          render: (data: any) => data ? 'Y' : ''
        }, // 21
        {
          title: 'NOFO',
          data: 'nofo',
          width: '80px',
          defaultContent: '',
          ngTemplateRef: { ref: this.foaCellRender }
        }, // 22
        {
          title: 'Date Added',
          data: 'dateAdded',
          width: '120px',
          defaultContent: '',
          render: (data: any) => {
            if (!data) return '';
            const d = new Date(data);
            if (isNaN(d.getTime())) return data;
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${mm}/${dd}/${d.getFullYear()} ${hh}:${min}`;
          }
        }, // 23
        {
          title: 'Added By',
          data: 'addedByName',
          width: '80px',
          defaultContent: '',
          render: (data: string, _t: any, row: any) => data ? `<a href="mailto:${row.addedByEmail}?subject=${row.grantNumber} - ${row.piName}">${data}</a>` : ''
        }, // 24
        {
          title: 'Action',
          data: null,
          orderable: false,
          width: '60px',
          className: 'all',
          render: (_data: any, _type: any, row: any) => {
            const expandedIcon = this.detailComponentsByApplId.has(row?.applId)
              ? 'fa-minus-circle'
              : 'fa-plus-circle';
            return `<button class="btn btn-link p-0 toggle-details d-block mx-auto" title="Details"><i class="far ${expandedIcon} fa-lg"></i></button>`;
          }
        }, // 25
      ],
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        {
          className: 'btn-reset',
          titleAttr: 'Reset Table',
          text: '<i class="fas fa-undo me-1"></i>Reset Table',
          action: this.resetTable.bind(this)
        },
        {
          extend: 'excel',
          className: 'btn-excel btn-export-all',
          titleAttr: 'Export',
          text: '</i>Export',
          title: null,
          header: true,
          action: this.exportGrantListResults.bind(this),
          exportOptions: { columns: [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] }      
        }
      ],
      order: [[15, 'desc']],
      fixedColumns: { left: 1, right: 1 },
      initComplete: () => {
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => this.bindSimpleUnsavedTableGuard(dt));
      },
      rowCallback: (row: Node, data: any) => {
        this.dtOptions.columns.forEach((column: any, ind: number) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell && cell.childNodes.length > 1) {
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
        const $cb = $('.select-checkbox', row);
        if ((data as any).selected) {
          $cb.addClass('selected');
        } else {
          $cb.removeClass('selected');
        }
      },
      headerCallback: (thead: Node, _data: any[]) => {
        // Reset header checkbox state on every draw; re-wired in drawCallback using the full container
        $('.select-checkbox', thead).removeClass('selected').off('click');
      },
      drawCallback: () => {
        setTimeout(() => {
          if (this.dtElement?.dtInstance) {
            this.dtElement.dtInstance.then((dt: DataTables.Api) => {

              this.realignDataTableColumns();
              this.bindSimpleUnsavedTableGuard(dt);

              // Export button is index 1 now that Reset Table occupies index 0
              dt.rows().count() > 0 ? (dt as any).button(1).enable() : (dt as any).button(1).disable();

              // Use container so fixedColumns clones are included
              const $container = $(dt.table(0).container());
              this.stampCheckboxApplIds(dt, $container);

              // Sorting by column headers should always clear current selections.
              $container
                .off('click.clearOnSort', 'thead th.sorting, thead th.sorting_asc, thead th.sorting_desc')
                .on('click.clearOnSort', 'thead th.sorting, thead th.sorting_asc, thead th.sorting_desc', () => {
                  this.clearSelections(dt, $container);
                });

              $container.find('thead .select-checkbox').off('click').on('click', () => {
                const $hdr = $container.find('thead .select-checkbox');
                if ($hdr.first().hasClass('selected')) {
                  $hdr.removeClass('selected');
                  $container.find('tbody .select-checkbox').removeClass('selected');
                  dt.rows().every(function() { (this.data() as any).selected = false; });
                  this.selectedRows.clear();
                } else {
                  $hdr.addClass('selected');
                  $container.find('tbody .select-checkbox').addClass('selected');
                  dt.rows().every(function() { (this.data() as any).selected = true; });
                  dt.rows().data().toArray().forEach((d: any) => this.selectedRows.set(d.applId, d));
                }
              });

              // Delegate from container so clone-table clicks resolve correctly
              $container.off('click', 'tbody .select-checkbox').on('click', 'tbody .select-checkbox', (e) => {
                const applIdAttr = String($(e.currentTarget).attr('data-applid') || '').trim();
                if (!applIdAttr) return;

                const currentRows = dt.rows({ page: 'current', order: 'current', search: 'applied' }).data().toArray() as any[];
                const d = currentRows.find((row: any) => String(row?.applId) === applIdAttr);
                if (!d) return;

                d.selected = !d.selected;
                $container.find(`tbody .select-checkbox[data-applid="${applIdAttr}"]`).toggleClass('selected', d.selected);
                d.selected ? this.selectedRows.set(d.applId, d) : this.selectedRows.delete(d.applId);
              });

              $(dt.table(0).body())
                .off('click', '.toggle-details')
                .on('click', '.toggle-details', (event) => {
                  const tr = $(event.currentTarget).closest('tr');
                  const row = dt.row(tr);
                  const runToggle = () => {
                    const rowData = row.data() as any;
                    const applId = rowData?.applId;

                    if (row.child.isShown()) {
                      this.detailComponentsByApplId.get(applId)?.destroy?.();
                      this.detailComponentsByApplId.delete(applId);
                      row.child.hide();
                      tr.removeClass('shown');
                      $(window).off('resize.detailSticky');
                      $(event.currentTarget).find('i').removeClass('fa-minus-circle').addClass('fa-plus-circle');
                    } else {

                      // Create Angular component host element
                      const hostElement = document.createElement('div');
                      // Sticky/width goes on this plain div, not the <td> — table-layout:fixed
                      // ignores inline width on colspanned cells, and sticky needs a non-table element
                      hostElement.classList.add('detail-row-sticky');

                      // Create Angular component dynamically
                      const componentRef =
                        createComponent(GrantDetailComponent, {
                          environmentInjector: this.environmentInjector,
                          hostElement: hostElement
                        });
                      componentRef.instance.data = rowData;
                      componentRef.instance.listId = this.listId;
                      componentRef.instance.close.subscribe(() => {
                        this.handleDetailRowClose(componentRef, applId, row, tr, $(event.currentTarget).find('i'));
                      });
                      // Cancel (either path) reverts GrantDetailComponent to read-only and
                      // stays open — no row teardown here. Deliberately a no-op with respect to
                      // DOM teardown: do NOT call componentRef.destroy(), row.child.hide(), or
                      // tr.removeClass('shown'). The chevron-collapse `close` subscriber above
                      // is unchanged and remains the only path that tears the row down.
                      componentRef.instance.editModeExited.subscribe(() => this.handleDetailEditModeExited());
                      // `saved` fires after every successful save (funding-fields and/or
                      // justification-only) once GrantDetailComponent has fully mutated the
                      // shared `rowData` object — redraw this row so the grid's own cells pick
                      // up the change immediately, without a page reload. No teardown here: the
                      // row must stay expanded, unlike the `close` (collapse) path above.
                      componentRef.instance.saved.subscribe(() => this.handleDetailSaved(row));

                      // Run Angular change detection
                      componentRef.changeDetectorRef.detectChanges();
                      this.detailComponentsByApplId.set(applId, componentRef);

                      // Give the Angular component to DataTables
                      row.child(hostElement).show();
                      tr.addClass('shown');
                      // Pin the detail row to the visible scroll viewport so it stays
                      // in view (and spans full width) while the parent table scrolls horizontally
                      const applyStickyWidth = () => {
                        const scrollBodyWidth = $container.find('.dataTables_scrollBody').width();
                        if (scrollBodyWidth) $(hostElement).css('width', scrollBodyWidth + 'px');
                      };
                      applyStickyWidth();
                      $(window).on('resize.detailSticky', applyStickyWidth);
                      $(event.currentTarget).find('i').removeClass('fa-plus-circle').addClass('fa-minus-circle');
                    }
                  };

                  this.executeWithUnsavedGuard(runToggle);
                });
            });
          }
        }, 100);
      }
    };
    setTimeout(() => this.dtTrigger.next(null));
  }

  ajaxCall($this: SearchListsComponent, _dataTablesParameters: any, callback: any): void {
    let grants = $this.cachedGrants;
    if ($this.filteredDoc) {
      grants = grants.filter(g => g.doc === $this.filteredDoc);
    }
    callback({ recordsTotal: grants.length, recordsFiltered: grants.length, data: grants });
  }

  private hasUnsavedDetailEdits(): boolean {
    for (const compRef of this.detailComponentsByApplId.values()) {
      if (compRef?.instance?.isSaveInProgress?.()) {
        continue;
      }
      if (compRef?.instance?.hasUnsavedChanges && compRef.instance.hasUnsavedChanges()) {
        return true;
      }
    }
    return false;
  }

  private consumeChildLeavePromptSuppression(): boolean {
    for (const compRef of this.detailComponentsByApplId.values()) {
      if (compRef?.instance?.consumeSuppressNextLeavePrompt?.()) {
        return true;
      }
    }
    return false;
  }

  private discardUnsavedDetailEdits(): void {
    for (const compRef of this.detailComponentsByApplId.values()) {
      if (compRef?.instance?.forceDiscardAndClose && compRef.instance.hasUnsavedChanges?.()) {
        compRef.instance.forceDiscardAndClose();
      }
    }
  }

  // GrantDetailComponent's `close` output means "tear this row down" — actual chevron-collapse
  // teardown. Extracted (rather than left as an inline arrow function) so it can be unit-tested
  // directly in isolation from the DataTables-driven `.toggle-details` click wiring.
  private handleDetailRowClose(componentRef: any, applId: number, row: any, tr: JQuery, toggleIcon: JQuery): void {
    componentRef.destroy();
    this.detailComponentsByApplId.delete(applId);
    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass('shown');
      toggleIcon.removeClass('fa-minus-circle').addClass('fa-plus-circle');
    }
  }

  // GrantDetailComponent's `editModeExited` output means "edit mode ended (Cancel), no teardown
  // needed" — deliberately a no-op with respect to DOM teardown. See
  // Prompt - Grant Detail Cancel Reverts to Read-Only.md.
  private handleDetailEditModeExited(): void {
    // Intentionally no-op: Cancel reverts GrantDetailComponent to read-only in place;
    // the row/section must remain expanded, unlike the `close` (collapse) path above.
  }

  // GrantDetailComponent's `saved` output means "the row's underlying data object was just
  // mutated in place" — DataTables caches rendered <td> content and does not auto-reflect
  // in-place JS object mutation, so an explicit invalidate()+draw() is required to make the
  // grid's own cells (and Grant Detail's own read-only view, via the same shared object) show
  // the new values without a page reload. Extracted (matching handleDetailRowClose()/
  // handleDetailEditModeExited()) for testability. Must NOT tear down or collapse the detail
  // row — unlike handleDetailRowClose(), row.child/tr classes are left untouched.
  private handleDetailSaved(row: any): void {
    row.invalidate().draw(false);
  }


  private executeWithUnsavedGuard(action: () => void): void {
    this.executeWithUnsavedGuardOptions(action);
  }

  private executeWithUnsavedGuardOptions(action: () => void, onCancel?: () => void): void {
    if (!this.hasUnsavedDetailEdits()) {
      action();
      return;
    }

    this.pendingGuardedAction = action;
    this.pendingGuardCancelAction = onCancel || null;
    this.unsavedWarningModalRef = this.modalService.open(this.unsavedChangesWarningModalRef, { centered: true });
  }

  private bindGlobalNavigationUnsavedGuard(): void {
    if (this.globalAnchorGuardCaptureHandler) {
      return;
    }

    this.globalAnchorGuardCaptureHandler = (event: MouseEvent) => {
      this.handleGlobalAnchorNavigationIntent(event);
    };
    document.addEventListener('click', this.globalAnchorGuardCaptureHandler, true);
  }

  private handleGlobalAnchorNavigationIntent(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const clickedEl = event.target as HTMLElement;
    if (!clickedEl) {
      return;
    }

    const anchor = clickedEl.closest('a[href]') as HTMLAnchorElement;
    if (!anchor) {
      return;
    }

    const navigationAction = this.buildGlobalAnchorNavigationAction(anchor);
    if (!navigationAction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    (event as any).stopImmediatePropagation?.();

    if (this.unsavedWarningModalRef) {
      return;
    }

    this.executeWithUnsavedGuardOptions(navigationAction);
  }

  private buildGlobalAnchorNavigationAction(anchor: HTMLAnchorElement): (() => void) | null {
    if (!this.hasUnsavedDetailEdits()) {
      return null;
    }

    if (!this.shouldGuardGlobalAnchorNavigation(anchor)) {
      return null;
    }

    const destination = new URL(anchor.href, window.location.href);
    return () => window.location.assign(destination.href);
  }

  private shouldGuardGlobalAnchorNavigation(anchor: HTMLAnchorElement): boolean {
    if (anchor.hasAttribute('routerLink') || anchor.hasAttribute('ng-reflect-router-link')) {
      return false;
    }

    if (anchor.hasAttribute('download')) {
      return false;
    }

    const target = (anchor.getAttribute('target') || '').trim().toLowerCase();
    if (target && target !== '_self') {
      return false;
    }

    const rawHref = (anchor.getAttribute('href') || '').trim();
    if (!rawHref) {
      return false;
    }

    const loweredHref = rawHref.toLowerCase();
    if (loweredHref.startsWith('javascript:') || loweredHref.startsWith('mailto:') || loweredHref.startsWith('tel:')) {
      return false;
    }

    const destination = new URL(anchor.href, window.location.href);
    const current = new URL(window.location.href);

    if (destination.href === current.href) {
      return false;
    }

    // Ignore same-page anchor toggles; they do not leave the current screen.
    if (destination.pathname === current.pathname && destination.search === current.search && destination.hash !== current.hash) {
      return false;
    }

    return true;
  }

  private bindSimpleUnsavedTableGuard(dt: DataTables.Api): void {
    const container = dt.table(0).container();
    if (!container) return;

    if (this.tableGuardContainerEl && this.tableGuardCaptureHandler) {
      this.tableGuardContainerEl.removeEventListener('click', this.tableGuardCaptureHandler, true);
    }

    this.tableGuardContainerEl = container as HTMLElement;
    this.tableGuardCaptureHandler = (event: Event) => {
      const clickedEl = event.target as HTMLElement;
      if (!clickedEl) return;

      const pageNode = clickedEl.closest(this.tablePageIntentSelector) as HTMLElement;
      const sortHeader = clickedEl.closest(this.tableSortIntentSelector) as HTMLElement;
      if (!pageNode && !sortHeader) return;

      if (!this.hasUnsavedDetailEdits()) return;

      event.preventDefault();
      event.stopPropagation();
      (event as any).stopImmediatePropagation?.();

      if (this.unsavedWarningModalRef) {
        return;
      }

      let action: (() => void) | null = null;
      if (pageNode) {
        if (pageNode.classList.contains('disabled') || pageNode.classList.contains('active')) return;
        action = this.buildPaginationIntentAction(dt, pageNode);
      } else if (sortHeader) {
        action = this.buildSortIntentAction(dt, sortHeader);
      }

      if (!action) return;
      this.executeWithUnsavedGuardOptions(action);
    };

    this.tableGuardContainerEl.addEventListener('click', this.tableGuardCaptureHandler, true);
  }

  private buildSortIntentAction(dt: DataTables.Api, sortHeader: HTMLElement): (() => void) | null {
    const columnIndex = $(sortHeader).index();
    if (columnIndex < 0) return null;

    const nextDir: 'asc' | 'desc' = sortHeader.classList.contains('sorting_asc') ? 'desc' : 'asc';
    return () => {
      this.clearSelections(dt);
      dt.order([columnIndex, nextDir]).draw(false);
    };
  }

  private clearSelections(dt: DataTables.Api, container?: JQuery<HTMLElement>): void {
    this.selectedRows.clear();
    dt.rows().every(function() {
      const rowData = this.data() as any;
      if (rowData) {
        rowData.selected = false;
      }
    });

    const $container = container || $(dt.table(0).container());
    $container.find('thead .select-checkbox').removeClass('selected');
    $container.find('tbody .select-checkbox').removeClass('selected');
  }

  private stampCheckboxApplIds(dt: DataTables.Api, container: JQuery<HTMLElement>): void {
    const currentRows = dt.rows({ page: 'current', order: 'current', search: 'applied' }).data().toArray() as any[];
    container.find('tbody').each(function() {
      const $dataRows = $(this).children('tr').not('.child');
      $dataRows.each((rowIndex: number, trEl: Element) => {
        const applId = currentRows[rowIndex]?.applId;
        const applIdValue = applId != null ? String(applId) : '';
        $(trEl).find('.select-checkbox').attr('data-applid', applIdValue);
      });
    });
  }

  private buildPaginationIntentAction(dt: DataTables.Api, pageNode: HTMLElement): (() => void) | null {
    const pageIndexAttr = pageNode.getAttribute('data-dt-idx');
    const label = (pageNode.textContent || '').trim().toLowerCase();
    const className = pageNode.className || '';

    const isFirst = className.includes('first') || label === 'first';
    const isLast = className.includes('last') || label === 'last';
    const isPrev = className.includes('previous') || label === 'previous';
    const isNext = className.includes('next') || label === 'next';
    const pageNum = Number(label);

    if (isFirst) return () => dt.page('first').draw('page');
    if (isLast) return () => dt.page('last').draw('page');
    if (isPrev) return () => dt.page('previous').draw('page');
    if (isNext) return () => dt.page('next').draw('page');

    if (pageIndexAttr !== null) {
      const idx = Number(pageIndexAttr);
      if (!isNaN(idx)) return () => dt.page(idx).draw('page');
    }

    if (!isNaN(pageNum)) {
      return () => dt.page(Math.max(pageNum - 1, 0)).draw('page');
    }

    return null;
  }

  onCancelUnsavedWarning(): void {
    const routeDecision = this.pendingRouteLeaveDecision;
    this.pendingRouteLeaveDecision = null;
    this.pendingGuardedAction = null;
    this.pendingGuardCancelAction?.();
    this.pendingGuardCancelAction = null;
    this.unsavedWarningModalRef?.dismiss();
    this.unsavedWarningModalRef = null;
    routeDecision?.(false);
  }

  onConfirmUnsavedWarning(): void {
    const routeDecision = this.pendingRouteLeaveDecision;
    this.pendingRouteLeaveDecision = null;
    const action = this.pendingGuardedAction;
    this.pendingGuardedAction = null;
    this.pendingGuardCancelAction = null;
    this.unsavedWarningModalRef?.close();
    this.unsavedWarningModalRef = null;
    this.discardUnsavedDetailEdits();
    action?.();
    routeDecision?.(true);
  }

  canDeactivate(): boolean | Observable<boolean> {
    if (this.consumeChildLeavePromptSuppression()) {
      return true;
    }

    if (!this.hasUnsavedDetailEdits()) {
      return true;
    }

    if (this.unsavedWarningModalRef) {
      return false;
    }

    return new Observable<boolean>((observer) => {
      this.pendingRouteLeaveDecision = (allow: boolean) => {
        observer.next(allow);
        observer.complete();
      };
      this.unsavedWarningModalRef = this.modalService.open(this.unsavedChangesWarningModalRef, { centered: true });
    });
  }

  onDocCountClick(doc: string): void {
    this.executeWithUnsavedGuard(() => {
      this.filteredDoc = this.filteredDoc === doc ? null : doc;
      this.throttle.reset();
      this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
    });
  }

  onBackToListClick(): void {
    this.executeWithUnsavedGuard(() => this.router.navigate([this.backRoute]));
  }

  onSendGrantsInDraftClick(): void {
    this.executeWithUnsavedGuard(() => this.logger.debug('Send Grants in Draft action requested'));
  }

  onBulkEditClick(): void {
    this.executeWithUnsavedGuard(() => this.onBulkEdit());
  }

  onAddGrantsToListClick(): void {
    this.executeWithUnsavedGuard(() => this.onAddGrantsToList());
  }

  onRemoveSelectedClick(): void {
    this.executeWithUnsavedGuard(() => this.onRemoveSelected());
  }

  resetTable(): void {
    this.filteredDoc = null;
    this.selectedRows.clear();
    this.cachedGrants.forEach((g: any) => g.selected = false);
    this.throttle.reset();
    this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
      dt.order([15, 'desc']).search('').columns().search('').page.len(100);
      dt.ajax.reload();
    });
  }

  onRemoveSelected(): void {
    if (!this.selectedRows.size) return;
    this.removeModalRef = this.modalService.open(this.removeGrantsWarningModalRef, { centered: true });
  }

  onCancelRemove(): void {
    this.removeModalRef?.dismiss();
  }

  onConfirmRemove(): void {
    const applIds = Array.from(this.selectedRows.keys());
    this.fundingSubmissionsService.removeGrantsFromList(this.listId, applIds).subscribe({
      next: () => {
        this.selectedRows.clear();
        this.removeModalRef?.close();
        this.loadListMeta();
      },
      error: (err) => {
        this.logger.error('Remove grants from list failed', err);
        this.removeModalRef?.close();
      }
    });
  }

  onBulkEdit(): void {
    const grants = Array.from(this.selectedRows.values());
    this.router.navigate(['/funding-submissions/bulk-edit'], {
      state: { grants, listId: this.listId, selectionDate: this.selectionDate }
    });
  }

  onAddGrantsToList(): void {
    this.router.navigate(['/funding-submissions/create']);
  }

  ngOnDestroy(): void {
    if (this.pendingRealignFrame !== null) {
      window.cancelAnimationFrame(this.pendingRealignFrame);
      this.pendingRealignFrame = null;
    }
    if (this.globalAnchorGuardCaptureHandler) {
      document.removeEventListener('click', this.globalAnchorGuardCaptureHandler, true);
      this.globalAnchorGuardCaptureHandler = null;
    }
    if (this.tableGuardContainerEl && this.tableGuardCaptureHandler) {
      this.tableGuardContainerEl.removeEventListener('click', this.tableGuardCaptureHandler, true);
      this.tableGuardContainerEl = null;
      this.tableGuardCaptureHandler = null;
    }
    this.unsavedWarningModalRef?.close();
    this.removeModalRef?.close();
    this.detailComponentsByApplId.forEach((compRef) => compRef?.destroy?.());
    this.detailComponentsByApplId.clear();
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
        const fixedColumnsApi = (dt as any).fixedColumns?.();
        if (fixedColumnsApi?.relayout) {
          fixedColumnsApi.relayout();
        }
      });
    });
  }

   exportGrantListResults() {
    this.logger.debug('Exporting grant search results');
    this.loaderService.show();
    this.http.post(`/i2efsws/api/v1/funding-submissions/lists/${this.listId}/grants/export`, null, { responseType: 'arraybuffer' }).subscribe(

      (response) => {
        this.loaderService.hide();
        const blob = new Blob([response], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.download = 'funding_submissions_lists_result_all.xls';
        anchor.href = url;
        anchor.click();
      }

    );
  }
}
