import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Select2OptionData } from 'ng-select2';
import { FoaCellRendererComponent } from '../../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import {
  FundingSubmissionsControllerService,
  FundingSubmissionAddGrantsToListRequestDto,
  FundingSubmissionGrantSearchCriteriaDto,
  FundingSubmissionSearchResultDto,
  SelectionDateCodeDto
} from '@cbiit/i2efsws-lib';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import {
  FullGrantNumberCellRendererComponent
} from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { DatatableThrottle } from '../../../utils/datatable-throttle';
import { CancerActivityCellRendererComponent } from 'src/app/table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component';
import { HttpClient } from '@angular/common/http';

declare var $: any;

@Component({
  selector: 'app-create-funding-table',
  templateUrl: './create-funding-table.component.html',
  styleUrls: ['./create-funding-table.component.css']
})
export class CreateFundingTableComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('foaCellRender') foaCellRender: TemplateRef<FoaCellRendererComponent>;
  @ViewChild('nosiCellRender') nosiCellRender: TemplateRef<FoaCellRendererComponent>;
  @ViewChild('addToListModal') private addToListModalRef: TemplateRef<any>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('existsInListRenderer') existsInListRenderer: TemplateRef<any>;

  @Input() grantViewerUrl: string;
  @Input() eGrantsUrl: string;
  @Input() i2eURL: string;
  @Output() firstDraw = new EventEmitter<void>();
  

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  isDtInitialized = false;
  showResults = false;
  selectAll = false;
  grantList: FundingSubmissionSearchResultDto[] = [];
  throttle: DatatableThrottle = new DatatableThrottle();
  selectedRows: Map<number, FundingSubmissionSearchResultDto> = new Map();
  private currentPage = 0;
  private pendingRestorePage: number | null = null;
  private pendingRestoreRows: Map<number, FundingSubmissionSearchResultDto> | null = null;

  private searchCriteria: FundingSubmissionGrantSearchCriteriaDto = {};
  private modalRef: NgbModalRef;
  selectedDate = '';
  selectionDateOptions: Select2OptionData[] = [];

  constructor(
    private fundingSubmissionsControllerService: FundingSubmissionsControllerService,
    private loaderService: LoaderService,
    private propertiesService: AppPropertiesService,
    private logger: NGXLogger,
    private modalService: NgbModal,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.fundingSubmissionsControllerService.getSelectionDateCodes().subscribe({
      next: (dates: SelectionDateCodeDto[]) => {
        this.selectionDateOptions = dates.map(d => ({ id: d.code, text: d.name || d.description || d.code }));
        this.logger.debug('selectionDateOptions:', this.selectionDateOptions);
      },
      error: (err) => this.logger.error('Failed to load selection date codes', err)
    });
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: true,
      processing: false,
      destroy: true,
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
      ajax: (dataTablesParameters: any, callback) => {
        this.throttle.invoke(this, dataTablesParameters, callback, this.ajaxCall);
      },
      columns: [
        {
          title: '',
          data: 'applId',
          orderable: false,
          width: '20px',
          className: 'all select-checkbox',
          render: () => ''
        },//0
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '140px',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer },
          className: 'all'
        }, // 1
        {
          title: 'PI',
          data: 'piName',
          width: '140px',
          defaultContent: '',
          render: (data, type, row) => {
            if (!data) return '';
            // piName is "Lastname, Firstname" — subject should only use the last name
            const piLastName = data.split(',')[0].trim();
            const subject = encodeURIComponent(`${row.grantNumber} - ${piLastName}`);
            return `<a href="mailto:${row.piEmail}?subject=${subject}">${data}</a>`;
          }
        }, // 2
        {
          title: 'Institution',
          data: 'orgName',
          width: '150px',
          defaultContent: ''
        }, // 3
        {
          title: 'Project Title',
          data: 'projectTitle',
          width: '200px',
          defaultContent: ''
        }, // 4
        {
          title: 'DOC',
          data: 'doc',
          width: '40px',
          defaultContent: ''
        }, // 5
        {
          title: 'NCAB',
          data: 'ncabDate',
          width: '50px',
          defaultContent: '',
          render: (data, type) => {
            if (!data) return '';
            const d = new Date(data);
            return isNaN(d.getTime()) ? data : `${d.getMonth() + 1}/${d.getFullYear()}`;
          }
        }, // 6
        {
          title: 'NOFO',
          data: 'nofo',
          width: '50px',
          ngTemplateRef: { ref: this.foaCellRender },
        }, // 7
        {
          title: 'NOSI',
          data: 'nosi',
          width: '40px',
          ngTemplateRef: { ref: this.nosiCellRender },
        }, // 8
        {
          title: 'Pctl',
          data: 'percentile',
          width: '30px',
          defaultContent: '',
          render: (data) => (data != null && data !== '') ? `${data}%` : ''
        }, // 9
        {
          title: 'PriScr',
          data: 'priorityScoreDisplay',
          width: '40px',
          defaultContent: ''
        }, // 10
        {
          title: 'PreScr',
          data: 'previousScore',
          width: '40px',
          defaultContent: ''
        }, // 11
        {
          title: 'PI Req. Total',
          data: 'piRequestedTotal',
          width: '90px',
          defaultContent: '',
          render: (data, type) => {
            if (type === 'display' && data != null) {
              return '$' + Number(data).toLocaleString('en-US');
            }
            return data ?? '';
          }
        }, // 12
        {
          title: 'Exists in List',
          data: 'existsInListSelectionDate',
          width: '50px',
          defaultContent: '',
          ngTemplateRef: { ref: this.existsInListRenderer },
        }, // 13
        {
          title: 'ESI',
          data: 'esiFlag',
          width: '30px',
          render: (data) => data === true ? 'Y' : data === false ? 'N' : ''
        }, // 14
        {
          title: 'CA',
          data: 'cancerActivity',
          width: '30px',
          ngTemplateRef: { ref: this.cancerActivityRenderer },
        }, // 15
      ],

      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel btn-export-all',
          titleAttr: 'Export',
          text: '</i>Export',
          filename: 'fs-funding-list-grants',
          title: null,
          header: true,
          action: this.exportGrantSearchResults.bind(this),
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }      
        }
      ],
      order: [[1, 'desc']],
      fixedColumns: {
        left: 3,
      },
     rowCallback: (row: Node, data: any) => {
        this.dtOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell.childNodes.length > 1) {
              $(cell.childNodes.item(0)).remove();
            }
          }
        });

        const $checkbox = $('.select-checkbox', row);
        $checkbox.off('click');

        if (data.checkboxDisabled) {
          data.selected = false;
          this.selectedRows.delete(data.applId);
          $checkbox.removeClass('selected').addClass('disabled')
            .attr('title', 'Already exists in a list.');
          return;
        }

        $checkbox.removeClass('disabled').removeAttr('title');
        // Restore from Map so selections survive page navigation
        data.selected = this.selectedRows.has(data.applId);
        if (data.selected) {
          $checkbox.addClass('selected');
        } else {
          $checkbox.removeClass('selected');
        }

        $checkbox.on('click', () => {
          data.selected = !data.selected;
          if (data.selected) {
            $checkbox.addClass('selected');
            this.selectedRows.set(data.applId, data);
          } else {
            $checkbox.removeClass('selected');
            this.selectedRows.delete(data.applId);
          }
        });
      },
initComplete: () => {
        setTimeout(() => this.firstDraw.emit());
        // scrollX clones thead into a separate .dataTables_scrollHead table, so the
        // header checkbox click must be delegated off the container (bound once),
        // not off the "thead" node DataTables passes into headerCallback each draw.
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
          const $container = $(dt.table(0).container());
          $container.off('click.selectAll', 'thead .select-checkbox');
          $container.on('click.selectAll', 'thead .select-checkbox', () => {
            const pageData = dt.rows({ page: 'current' }).data().toArray();
            const nowSelected = !this.allDataSelected(pageData);
            for (const d of pageData.filter((row: any) => !row.checkboxDisabled)) {
              d.selected = nowSelected;
              if (nowSelected) {
                this.selectedRows.set(d.applId, d);
              } else {
                this.selectedRows.delete(d.applId);
              }
            }
            $container.find('thead .select-checkbox').toggleClass('selected', nowSelected);
            $container.find('tbody .select-checkbox').not('.disabled').toggleClass('selected', nowSelected);
          });
        });
      },
      headerCallback: (thead: Node, data: any[]) => {
        // Sync both the visible scrollHead clone and the original thead
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
          $(dt.table(0).container()).find('thead .select-checkbox')
            .toggleClass('selected', this.allDataSelected(data));
        });
      },
      drawCallback: () => {
        // Defer columns.adjust() so it runs AFTER FixedColumns' own draw.dt.dtfc
        // handler fires. FixedColumns applies position:sticky left-offsets on that
        // handler; if we adjust before it, header cells end up misaligned.
        setTimeout(() => {
          this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
            this.currentPage = dt.page();
            dt.columns.adjust();
            if (this.pendingRestorePage !== null && this.pendingRestorePage > 0) {
              const page = this.pendingRestorePage;
              this.pendingRestorePage = null;
              dt.page(page).draw('page');
            }
          });
        }, 0);
      },
    };
    // DataTable is initialized on first search, not here, so that dtOptions
    // is fully propagated via Angular change detection before the directive reads it.
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

allDataSelected(data: any[]): boolean {
    const selectableRows = data?.filter(row => !row.checkboxDisabled) ?? [];
    return selectableRows.length > 0 && selectableRows.every(row => this.selectedRows.has(row.applId));
  }
  clearResults(): void {
    this.showResults = false;
    this.grantList = [];
    this.selectedRows.clear();
    if (this.isDtInitialized) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.ajax.reload();
      });
    }
  }

  search(criteria: FundingSubmissionGrantSearchCriteriaDto): void {
    this.throttle.reset();
    if (this.pendingRestoreRows !== null) {
      this.selectedRows = this.pendingRestoreRows;
      this.pendingRestoreRows = null;
    } else {
      this.selectedRows.clear();
    }
    this.searchCriteria = criteria;
    this.showResults = true;

    if (this.isDtInitialized) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.ajax.reload();
      });
    } else {
      this.isDtInitialized = true;
      this.dtTrigger.next(null);
    }
  }

  ajaxCall($this: CreateFundingTableComponent, dataTablesParameters: any, callback: any): void {
    if (!$this.showResults) {
      callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      return;
    }
    const normalizeSearch = (s: any) => s ? { ...s, regex: s.regex === true || s.regex === 'true' } : s;

    const body: FundingSubmissionGrantSearchCriteriaDto = {
      ...$this.searchCriteria,
      draw: dataTablesParameters.draw,
      columns: (dataTablesParameters.columns || []).map((c: any) => ({ ...c, search: normalizeSearch(c.search) })),
      order: dataTablesParameters.order,
      start: dataTablesParameters.start,
      length: dataTablesParameters.length,
      search: normalizeSearch(dataTablesParameters.search)
    };

    $this.loaderService.show();
    $this.fundingSubmissionsControllerService.searchGrants(body).subscribe(
      result => {
        $this.grantList = result.data || [];
        callback({
          recordsTotal: result.recordsTotal,
          recordsFiltered: result.recordsFiltered,
          data: result.data
        });
        $this.loaderService.hide();
        setTimeout(() => {
          if ($this.dtElement?.dtInstance) {
            $this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
              dtInstance.columns.adjust();
            });
          }
        }, 0);
      },
      error => {
        $this.loaderService.hide();
        $this.logger.error('grant search error', error);
        callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      }
    );
  }

  addSelectedToList(): void {
    this.selectedDate = '';
    this.modalRef = this.modalService.open(this.addToListModalRef, { size: 'lg', centered: true });
  }

  cancelModal(): void {
    this.modalRef?.dismiss();
  }

  saveToList(): void {
    // Coerce to Number — DataTables can return applId as string at runtime
    const applIds = Array.from(this.selectedRows.keys()).map(id => Number(id));
    const body: FundingSubmissionAddGrantsToListRequestDto = {
      selectionDate: this.selectedDate,
      applIds
    };
    this.logger.debug('addGrantsToList request:', body);
    this.loaderService.show();
    this.fundingSubmissionsControllerService.addGrantsToList(body).subscribe({
      next: (result) => {
        this.loaderService.hide();
        this.logger.debug('addGrantsToList result:', result);
        this.modalRef?.close();
        this.router.navigate(['/funding-submissions/search'], { queryParams: { listId: result.listId, from: 'create' } });
      },
      error: (err) => {
        this.loaderService.hide();
        this.logger.error('addGrantsToList error', err?.status, err?.error, body);
      }
    });
  }

  get hasSelectedGrants(): boolean {
    return this.selectedRows.size > 0;
  }

  getState() {
    return {
      selectedRows: new Map(this.selectedRows),
      showResults: this.showResults,
      currentPage: this.currentPage,
      searchCriteria: { ...this.searchCriteria }
    };
  }

  restoreState(selectedRows: Map<number, FundingSubmissionSearchResultDto>, currentPage: number): void {
    this.pendingRestoreRows = new Map(selectedRows);
    this.pendingRestorePage = currentPage > 0 ? currentPage : null;
  }

  navigateToList(selectionDate: string): void {
    this.fundingSubmissionsControllerService.searchLists({ selectionCode: [selectionDate], start: 0, length: 1 }).subscribe({
      next: (result) => {
        const listId = result.data?.[0]?.listId;
        if (listId) {
          this.router.navigate(['/funding-submissions/search'], { queryParams: { listId, from: 'create' } });
        } else {
          this.logger.warn('No list found for selection date', selectionDate);
        }
      },
      error: (err) => this.logger.error('Failed to find list for selection date', err)
    });
  }

   exportGrantSearchResults() {
    this.logger.debug('Exporting grant search results');
    this.logger.debug(this.searchCriteria);
    const searchCriteria = JSON.parse(JSON.stringify(this.searchCriteria));
    searchCriteria.length = -1;
    this.loaderService.show();
    this.http.post('/i2efsws/api/v1/funding-submissions/grants/export', searchCriteria, { responseType: 'arraybuffer' }).subscribe(

      (response) => {
        this.loaderService.hide();
        const blob = new Blob([response], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.download = 'funding_submissions_grants_result_all.xls';
        anchor.href = url;
        anchor.click();
      }

    );
  }
}
