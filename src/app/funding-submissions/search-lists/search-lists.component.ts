import { AfterViewInit, ChangeDetectorRef, Component, EnvironmentInjector, OnDestroy, OnInit, TemplateRef, ViewChild, createComponent } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Subject, forkJoin } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { GrantDetailComponent } from './grant-detail/grant-detail.component';
import { Select2OptionData } from 'ng-select2';
import { FundingSubmissionsControllerService, FundingSubmissionListGrantDto } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { DatatableThrottle } from '../../utils/datatable-throttle';
import { openNewWindow } from '../../utils/utils';
import { FoaCellRendererComponent } from '../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import { FullGrantNumberCellRendererComponent } from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { HttpClient } from '@angular/common/http';

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

  private removeModalRef: NgbModalRef;

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

  constructor(
    private loaderService: LoaderService,
    private route: ActivatedRoute,
    private router: Router,
    private logger: NGXLogger,
    private environmentInjector: EnvironmentInjector,
    private propertiesService: AppPropertiesService,
    private cdr: ChangeDetectorRef,
    private fundingSubmissionsService: FundingSubmissionsControllerService,
    private http: HttpClient,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
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
    this.documentURL = (this.propertiesService.getProperty('DOCVIEWER_URL') || '').trim()
      || 'https://i2e-test.nci.nih.gov/documentviewer/';
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
    'Under Review': 'fa-arrows-rotate',
    'Under NCI Director Review': 'fa-gavel'
  };

  getDocStatusIcon(status: string): string {
    return this.docStatusIcons[status] || 'fa-circle';
  }

  getDocStatusClass(status: string): string {
    return 'status-' + (status || '').toLowerCase().replace(/\s+/g, '-');
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
          render: (data: boolean, _t: any, row: any) => data ? `<a href="${row.absUrl}" target="_blank">Y</a>` : ''
        }, // 1
        {
          title: 'SS',
          data: 'summaryStatementAvailable',
          width: '40px',
          defaultContent: '',
          render: (data: boolean, _t: any, row: any) => data ? `<a href="${row.ssUrl}" target="_blank">Y</a>` : ''
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
          data: 'impacStatus',
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
          defaultContent: ''
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
          data: 'docNciSelection',
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
          data: 'annualOrMyf',
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
          defaultContent: '<button class="btn btn-link p-0 toggle-details" title="Details"><i class="far fa-plus-circle fa-lg"></i></button>'
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

              dt.columns.adjust();

              // Export button is index 1 now that Reset Table occupies index 0
              dt.rows().count() > 0 ? (dt as any).button(1).enable() : (dt as any).button(1).disable();

              // Use container so fixedColumns clones are included
              const $container = $(dt.table(0).container());
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
                const trIndex = $(e.currentTarget).closest('tr').index();
                const rowIndexes = dt.rows({ page: 'current', order: 'current' }).indexes().toArray();
                if (trIndex < 0 || trIndex >= rowIndexes.length) return;
                const d = dt.row(rowIndexes[trIndex]).data() as any;
                d.selected = !d.selected;
                $container.find('tbody').each(function() {
                  $(this).children('tr').eq(trIndex).find('.select-checkbox').toggleClass('selected', d.selected);
                });
                d.selected ? this.selectedRows.set(d.applId, d) : this.selectedRows.delete(d.applId);
              });

              $(dt.table(0).body())
                .off('click', '.toggle-details')
                .on('click', '.toggle-details', (event) => {
                  const tr = $(event.currentTarget).closest('tr');
                  const row = dt.row(tr);
                  if (row.child.isShown()) {
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
                    // Optional: pass data to the component
                    componentRef.instance.data = row.data();
                    componentRef.instance.listId = this.listId;
                    //row.data().grantNumber;
                    // Run Angular change detection
                    componentRef.changeDetectorRef.detectChanges();
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
                    // Store the ComponentRef so it can be destroyed later
                    (tr[0] as HTMLElement).dataset.componentRef =
                      String(componentRef);
                  }
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

  onDocCountClick(doc: string): void {
    this.filteredDoc = this.filteredDoc === doc ? null : doc;
    this.throttle.reset();
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
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
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

   exportGrantListResults() {
    this.logger.debug('Exporting grant search results');
    const cachedGrants = JSON.parse(JSON.stringify(this.cachedGrants));
    cachedGrants.length = -1;
    this.loaderService.show();
    this.http.post('/i2efsws/api/v1/funding-submissions/lists/export', cachedGrants, { responseType: 'arraybuffer' }).subscribe(

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
