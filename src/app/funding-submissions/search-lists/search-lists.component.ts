import { AfterViewInit, Component, EnvironmentInjector, OnDestroy, OnInit, TemplateRef, ViewChild, createComponent } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { GrantDetailComponent } from './grant-detail/grant-detail.component';
import { Select2OptionData } from 'ng-select2';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { DatatableThrottle } from '../../utils/datatable-throttle';
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

  i2eURL = '';
  grantViewerUrl = '';
  eGrantsUrl = '';

  selectionDate = '';
  listId = 0;
  listStatus = '';
  totalGrants = 0;
  docRecommendedTotal = 0;

  docStatusColumns: any[][] = [];
  listHistory: any[] = [];

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  throttle: DatatableThrottle = new DatatableThrottle();

  selectedViewDoc: string = null;
  selectedRows = new Map<number, any>();
  viewDocOptions: Select2OptionData[] = [
    { id: 'abstracts', text: 'Abstract(s)' },
    { id: 'summaries', text: 'Summary Statement(s)' },
    { id: 'both', text: 'Abstract(s) and Summary Statement(s)' },
  ];

  constructor(
    private loaderService: LoaderService,
    private route: ActivatedRoute,
    private router: Router,
    private logger: NGXLogger,
    private environmentInjector: EnvironmentInjector,
    private propertiesService: AppPropertiesService,
    private fundingSubmissionsService: FundingSubmissionsControllerService,
    private http: HttpClient
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
    });
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = this.propertiesService.getProperty('I2EWEB_URL').trim();
  }

  private loadListMeta(): void {
    this.fundingSubmissionsService.searchLists({ listId: this.listId, start: 0, length: 1 }).subscribe({
      next: (result) => {
        const list = result.data?.[0];
        if (list) {
          this.selectionDate = list.code || this.selectionDate;
          this.listStatus = list.listStatus || '';
        }
        this.logger.debug('List metadata:', list);
      },
      error: (err) => this.logger.error('Failed to load list metadata', err)
    });
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: true,
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
          data: 'absFlag',
          width: '40px',
          defaultContent: '',
          render: (data: boolean, _t: any, row: any) => data ? `<a href="${row.absUrl}" target="_blank">Y</a>` : ''
        }, // 1
        {
          title: 'SS',
          data: 'ssFlag',
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
          data: 'budgetCategory',
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
          data: 'i2Status',
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
          title: 'Priority Score',
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
          data: 'appTcEst',
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
          data: 'docRecAmt',
          width: '90px',
          defaultContent: '',
          render: (data: number) => data != null ? '$' + Number(data).toLocaleString('en-US') : ''
        }, // 16
        {
          title: 'DOC Rec. % Red.',
          data: 'docRecPctRed',
          width: '95px',
          defaultContent: '',
          render: (data: number) => data != null ? `${data}%` : ''
        }, // 17
        {
          title: 'DOC/NCI Sel',
          data: 'docNciSel',
          width: '100px',
          defaultContent: ''
        }, // 18
        {
          title: 'Two-Year Annual Funding R01 (HRHR)?',
          data: 'twoYrFunding',
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
          data: 'recused',
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
          data: 'addedBy',
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
          extend: 'excel',
          className: 'btn-excel btn-export-all',
          titleAttr: 'Export All Results',
          text: '</i>Export All Results',
          title: null,
          header: true,
          action: this.exportGrantListResults.bind(this),
          exportOptions: { columns: [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] }      
        }
      ],
      order: [[3, 'asc']],
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
        $cb.off('click').on('click', () => {
          $cb.toggleClass('selected');
          const applId = (data as any).applId;
          $cb.hasClass('selected') ? this.selectedRows.set(applId, data) : this.selectedRows.delete(applId);
        });
      },
      drawCallback: () => {
        setTimeout(() => {
          if (this.dtElement?.dtInstance) {
            this.dtElement.dtInstance.then((dt: DataTables.Api) => {

              dt.columns.adjust();

              dt.rows().count() > 0 ? (dt as any).button(0).enable() : (dt as any).button(0).disable();

              $(dt.table(0).body())
                .off('click', '.toggle-details')
                .on('click', '.toggle-details', (event) => {
                  const tr = $(event.currentTarget).closest('tr');
                  const row = dt.row(tr);
                  if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                    $(event.currentTarget).find('i').removeClass('fa-minus-circle').addClass('fa-plus-circle');
                  } else {

                    // Create Angular component host element
                    const hostElement = document.createElement('div');

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

  ajaxCall($this: SearchListsComponent, dataTablesParameters: any, callback: any): void {
    if (!$this.listId) {
      callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      return;
    }
    const normalizeSearch = (s: any) => s ? { ...s, regex: s.regex === true || s.regex === 'true' } : s;
    // listId is not in the DTO interface but accepted server-side to scope results to the list
    const body = {
      listId: $this.listId,
      draw: dataTablesParameters.draw,
      columns: (dataTablesParameters.columns || []).map((c: any) => ({ ...c, search: normalizeSearch(c.search) })),
      order: dataTablesParameters.order,
      start: dataTablesParameters.start,
      length: dataTablesParameters.length,
      search: normalizeSearch(dataTablesParameters.search)
    } as any;
    $this.fundingSubmissionsService.searchGrants(body).subscribe({
      next: (result) => {
        $this.totalGrants = result.recordsTotal ?? 0;
        callback({ recordsTotal: result.recordsTotal, recordsFiltered: result.recordsFiltered, data: result.data });
      },
      error: (err) => {
        $this.logger.error('Failed to load list grants', err);
        callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      }
    });
  }

  onRemoveSelected(): void {
    const applIds = Array.from(this.selectedRows.keys());
    if (!applIds.length) return;
    this.fundingSubmissionsService.removeGrantsFromList(this.listId, applIds).subscribe({
      next: () => {
        this.selectedRows.clear();
        this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
      },
      error: (err) => this.logger.error('Remove grants from list failed', err)
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
    this.logger.debug(this.fundingSubmissionsService.searchLists);
    const searchCriteria = JSON.parse(JSON.stringify(this.fundingSubmissionsService.searchLists));
    searchCriteria.length = -1;
    this.loaderService.show();
    this.http.post('/i2efsws/api/v1/funding-submissions/lists/export', searchCriteria, { responseType: 'arraybuffer' }).subscribe(

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
