import { AfterViewInit, Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Select2OptionData } from 'ng-select2';
import { FoaCellRendererComponent } from '../../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import {
  FundingSubmissionsControllerService,
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
  

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  isDtInitialized = false;
  showResults = false;
  selectAll = false;
  grantList: FundingSubmissionSearchResultDto[] = [];
  throttle: DatatableThrottle = new DatatableThrottle();
  selectedRows: Map<number, FundingSubmissionSearchResultDto> = new Map();

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
    private router: Router
  ) {}

  ngOnInit(): void {
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.fundingSubmissionsControllerService.getSelectionDateCodes().subscribe({
      next: (dates: SelectionDateCodeDto[]) => {
        this.selectionDateOptions = dates.map(d => ({ id: d.code, text: d.name || d.description || d.code }));
      },
      error: (err) => this.logger.error('Failed to load selection date codes', err)
    });
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
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
            return (!data) ? '' : `<a href="mailto:${row.piEmail}?subject=${row.grantNumber} - ${row.piName}">${data}</a>`;
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
          className: 'btn-excel',
          titleAttr: 'Export All Results',
          text: '</i>Export All Results',
          filename: 'fs-funding-list-grants',
          title: null,
          header: true,
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] }
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
        // Restore from Map so selections survive page navigation
        data.selected = this.selectedRows.has(data.applId);
        if (data.selected) {
          $checkbox.addClass('selected');
        } else {
          $checkbox.removeClass('selected');
        }

        $checkbox.off('click');
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

      headerCallback: (thead: Node, data: any[]) => {
        const $node = $('.select-checkbox', thead);
        const $header = $('.sorting', thead);
        if ($header) {
          $header.on('click', () => {
          })
        }
        // this.tableHtead = thead;
        if ($node) {
          // Check Map so header state is accurate after page navigation
          if (this.allDataSelected(data)) {
            $node.addClass('selected');
          }
          else {
            $node.removeClass('selected');
          }
          $node.off('click');
          $node.on('click', () => {
            if ($node.hasClass('selected')) {
              $node.removeClass('selected');
              for (const d of data) {
                d.selected = false;
                this.selectedRows.delete(d.applId);
              }
              $node.closest('table').find('.select-checkbox').removeClass('selected');
            } else {
              $node.addClass('selected');
              for (const d of data) {
                d.selected = true;
                this.selectedRows.set(d.applId, d);
              }
              $node.closest('table').find('.select-checkbox').addClass('selected');
            }
          });
        }
      },
      drawCallback: () => {
        // Defer columns.adjust() so it runs AFTER FixedColumns' own draw.dt.dtfc
        // handler fires. FixedColumns applies position:sticky left-offsets on that
        // handler; if we adjust before it, header cells end up misaligned.
        setTimeout(() => {
          this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
            dt.columns.adjust();
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
    return data?.length > 0 && data.every(row => this.selectedRows.has(row.applId));
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
    this.selectedRows.clear();
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
    const applIds = Array.from(this.selectedRows.keys());
    const selectedItem = this.selectionDateOptions.find(d => d.id === String(this.selectedDate));
    const dateText = selectedItem?.text || String(this.selectedDate);
    this.logger.debug('saveToList:', { applIds, selectionDate: dateText });
    this.modalRef?.close({ applIds, selectionDate: dateText });
    this.router.navigate(['/funding-submissions/search'], { queryParams: { selectionDate: dateText } });
  }

  get hasSelectedGrants(): boolean {
    return this.selectedRows.size > 0;
  }
}
