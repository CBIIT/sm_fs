import { AfterViewInit, Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Select2OptionData } from 'ng-select2';
import { FoaCellRendererComponent } from '../../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import {
  FundingAllocationsControllerService,
  FundingAllocationGrantSearchCriteriaDto,
  FundingAllocationSearchResultDto
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

  @Input() grantViewerUrl: string;
  @Input() eGrantsUrl: string;
  @Input() i2eURL: string;
  

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  isDtInitialized = false;
  showResults = false;
  selectAll = false;
  grantList: FundingAllocationSearchResultDto[] = [];
  throttle: DatatableThrottle = new DatatableThrottle();
  selectedRows: Map<number, FundingAllocationSearchResultDto> = new Map();

  private searchCriteria: FundingAllocationGrantSearchCriteriaDto = {};
  private modalRef: NgbModalRef;
  selectedDate = '';
  readonly mockSelectionDates: Select2OptionData[] = [
    { id: '1', text: 'June 16' },
    { id: '2', text: 'July 16' },
    { id: '3', text: 'July 23' },
    { id: '4', text: 'August 6' },
    { id: '5', text: 'August 20' },
  ];

  constructor(
    private fundingAllocationsControllerService: FundingAllocationsControllerService,
    private loaderService: LoaderService,
    private propertiesService: AppPropertiesService,
    private logger: NGXLogger,
    private modalService: NgbModal,
    private router: Router
  ) {}

  ngOnInit(): void {
    $.fn.DataTable.ext.pager.numbers_length = 5;
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
          width: '36px',
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
          data: 'institution',
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
          width: '60px',
          defaultContent: ''
        }, // 5
        {
          title: 'NCAB',
          data: 'ncabDate',
          width: '80px',
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
          width: '100px',
          ngTemplateRef: { ref: this.foaCellRender },
        }, // 7
        {
          title: 'NOSI',
          data: 'nosi',
          width: '100px',
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
          width: '30px',
          defaultContent: ''
        }, // 10
        {
          title: 'Previous Scr',
          data: 'previousScore',
          width: '100px',
          defaultContent: ''
        }, // 11
        {
          title: 'PI Requested Total',
          data: 'piRequestedTotal',
          width: '120px',
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
          width: '110px',
          defaultContent: ''
        }, // 13
        {
          title: 'ESI',
          data: 'esiFlag',
          width: '30px',
          render: (data) => data === true ? 'Y' : data === false ? '' : ''
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
          // Reset header checkbox on load (only once)
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
                //this.onCaptureSelectionEvent(d, false);
              }
              $node.closest('table').find('.select-checkbox').removeClass('selected');
            } else {
              $node.addClass('selected');
              for (const d of data) {
                d.selected = true;
                //this.onCaptureSelectionEvent(d, true);
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
    return data?.length > 0 && data.every(row => row.selected === true);
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

  search(criteria: FundingAllocationGrantSearchCriteriaDto): void {
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

  // TODO: remove mock data when real API is wired
 private static readonly MOCK_DATA: any[] = [
    { applId: 1001, fullGrantNum: '2R01CA259365-06', piFullName: 'Housley', piEmail: 'housley@nih.gov', lastName: 'Housley', orgName: 'Johns Hopkins University', projectTitle: 'Novel Biomarkers in Colorectal Cancer', doc: 'DCB', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'PA23-261', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-19-032', irgPercentileNum: 13, priorityScoreNum: 29, previousScore: 20, totalCost: 550774, existsInList: 'July 16', existsInListUrl: '#list-1', esiStatus: 'No', cayCode: '' },
    { applId: 1002, fullGrantNum: '2R01CA259365-06', piFullName: 'Lytle', piEmail: 'lytle@nih.gov', lastName: 'Lytle', orgName: 'Stanford University', projectTitle: 'Immunotherapy Response Prediction', doc: 'DCB', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'PA23-261', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-29-032', irgPercentileNum: 10, priorityScoreNum: 27, previousScore: 20, totalCost: 712030, existsInList: 'July 16', existsInListUrl: '#list-1', esiStatus: 'Yes', cayCode: '' },
    { applId: 1003, fullGrantNum: '2R01CA259365-06', piFullName: 'Morris', piEmail: 'morris@nih.gov', lastName: 'Morris', orgName: 'University of Michigan', projectTitle: 'Multi-Center Lung Cancer Screening Trial', doc: 'DCB', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'PA23-261', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-29-032', irgPercentileNum: 11, priorityScoreNum: 30, previousScore: 20, totalCost: 300112, existsInList: 'July 17', existsInListUrl: '', esiStatus: 'Yes', cayCode: '' },
    { applId: 1004, fullGrantNum: '2R01CA259365-06', piFullName: 'Wang', piEmail: 'wang@nih.gov', lastName: 'Wang', orgName: 'MD Anderson Cancer Center', projectTitle: 'Epigenetic Regulation in Breast Cancer Metastasis', doc: 'DCTD', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'PA23-261', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-29-032', irgPercentileNum: 8, priorityScoreNum: 14, previousScore: 20, totalCost: 50037, existsInList: 'July 18', existsInListUrl: '', esiStatus: 'Yes', cayCode: '' },
    { applId: 1005, fullGrantNum: 'P50CA567890-01', piFullName: 'Davis, Michael E.', piEmail: 'm.davis@nih.gov', lastName: 'Davis', orgName: 'Memorial Sloan Kettering', projectTitle: 'SPORE in Prostate Cancer', doc: 'DCP', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'RFA-CA-24-030', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-24-003', irgPercentileNum: 22, priorityScoreNum: 35, previousScore: 30, totalCost: 1200000, existsInList: '', existsInListUrl: '', esiStatus: 'No', cayCode: 'CB' },
    { applId: 1006, fullGrantNum: 'R03CA678901-01', piFullName: 'Martinez, Linda F.', piEmail: 'l.martinez@nih.gov', lastName: 'Martinez', orgName: 'University of Texas', projectTitle: 'Pilot Study: Pancreatic Cancer Early Detection', doc: 'DCCPS', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'PA-24-003', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: '', irgPercentileNum: 18, priorityScoreNum: 32, previousScore: 28, totalCost: 75000, existsInList: '', existsInListUrl: '', esiStatus: 'Yes', cayCode: '' },
    { applId: 1007, fullGrantNum: 'R01CA789012-01', piFullName: 'Wilson, James G.', piEmail: 'j.wilson@nih.gov', lastName: 'Wilson', orgName: 'Yale University', projectTitle: 'CAR-T Cell Engineering for Hematologic Malignancies', doc: 'DCB', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'RFA-CA-24-040', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: '', irgPercentileNum: 5, priorityScoreNum: 22, previousScore: 25, totalCost: 450000, existsInList: '', existsInListUrl: '', esiStatus: 'No', cayCode: 'TG' },
    { applId: 1008, fullGrantNum: 'U54CA890123-01', piFullName: 'Anderson, Susan H.', piEmail: 's.anderson@nih.gov', lastName: 'Anderson', orgName: 'Harvard Medical School', projectTitle: 'NCI Physical Sciences Oncology Center', doc: 'DCCPS', formattedCouncilMeetingDate: '10/2026', rfaPaNumber: 'RFA-CA-24-050', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-24-004', irgPercentileNum: 15, priorityScoreNum: 28, previousScore: 22, totalCost: 2100000, existsInList: 'July 20', existsInListUrl: '#list-2', esiStatus: 'Yes', cayCode: 'BC' },
  ];

  ajaxCall($this: CreateFundingTableComponent, dataTablesParameters: any, callback: any): void {
    if (!$this.showResults) {
      callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      return;
    }

    // strip empty strings, nulls, undefined, and empty arrays so the backend doesn't reject them
 /*    const cleanedCriteria = Object.fromEntries(
      Object.entries($this.searchCriteria).filter(([, v]) => {
        if (v === null || v === undefined || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    ) as FundingAllocationGrantSearchCriteriaDto; */

    // DataTables sends search.regex as a string ("false"/"true"); backend expects boolean.
    const normalizeSearch = (s: any) => s ? { ...s, regex: s.regex === true || s.regex === 'true' } : s;

    const body: FundingAllocationGrantSearchCriteriaDto = {
      ...$this.searchCriteria,
      draw: dataTablesParameters.draw,
      columns: (dataTablesParameters.columns || []).map((c: any) => ({ ...c, search: normalizeSearch(c.search) })),
      order: dataTablesParameters.order,
      start: dataTablesParameters.start,
      length: dataTablesParameters.length,
      search: normalizeSearch(dataTablesParameters.search)
    };

    $this.loaderService.show();
    $this.fundingAllocationsControllerService.searchGrants(body).subscribe(
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
    this.selectedDate = this.mockSelectionDates[0].id as string;
    this.modalRef = this.modalService.open(this.addToListModalRef, { size: 'lg', centered: true });
  }

  cancelModal(): void {
    this.modalRef?.dismiss();
  }

  saveToList(): void {
    const applIds = Array.from(this.selectedRows.keys());
    const selectedItem = this.mockSelectionDates.find(d => d.id === String(this.selectedDate));
    const dateText = selectedItem?.text || String(this.selectedDate);
    this.logger.debug('saveToList:', { applIds, selectionDate: dateText });
    this.modalRef?.close({ applIds, selectionDate: dateText });
    this.router.navigate(['/funding-selections/search'], { state: { selectionDate: dateText } });
  }

  get hasSelectedGrants(): boolean {
    return this.selectedRows.size > 0;
  }
}
