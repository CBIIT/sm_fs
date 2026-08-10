import { AfterViewInit, Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import {
  FsSearchControllerService,
  FundSelectSearchCriteria,
  FundingAllocationGrantSearchCriteriaDto,
  FundingGrantQueryDto
} from '@cbiit/i2efsws-lib';
import { LoaderService } from '@cbiit/i2ecui-lib';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import {
  FullGrantNumberCellRendererComponent
} from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { DatatableThrottle } from '../../../utils/datatable-throttle';

declare var $: any;

@Component({
  selector: 'app-create-funding-table',
  templateUrl: './create-funding-table.component.html',
  styleUrls: ['./create-funding-table.component.css']
})
export class CreateFundingTableComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;

  @Input() grantViewerUrl: string;
  @Input() eGrantsUrl: string;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  isDtInitialized = false;
  showResults = false;
  selectAll = false;
  grantList: FundingGrantQueryDto[] = [];
  throttle: DatatableThrottle = new DatatableThrottle();
  selectedRows: Map<number, FundingGrantQueryDto> = new Map();

  private searchCriteria: FundSelectSearchCriteria = {};

  constructor(
    private fsSearchControllerService: FsSearchControllerService,
    private loaderService: LoaderService,
    private logger: NGXLogger
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
          className: 'all select-checkbox',
          render: () => ''
        },//0
        {
          title: 'Grant Number',
          data: 'fullGrantNum',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer },
          className: 'all'
        }, // 1
        {
          title: 'PI',
          data: 'piFullName',
          defaultContent: '',
          render: (data, type, row) => {
            return (!data) ? '' : `<a href="mailto:${row.piEmail}?subject=${row.fullGrantNum} - ${row.lastName}">${data}</a>`;
          }
        }, // 2
        { title: 'Institution', data: 'orgName', defaultContent: '' }, // 3
        { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
         { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
          { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
           { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
          { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
           { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
         { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
          { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
           { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
          { title: 'Project Title', data: 'projectTitle', defaultContent: '' }, // 4
        { title: 'DOC', data: 'doc', defaultContent: '' }, // 5
        { title: 'NCAB', data: 'formattedCouncilMeetingDate', defaultContent: '' }, // 6
        {
          title: 'NOFO',
          data: 'rfaPaNumber',
          defaultContent: '',
          render: (data, type, row) => {
            return (!data) ? '' : `<a href="${row.nihGuideAddr}" target="_blank" rel="noopener noreferrer">${data}</a>`;
          }
        }, // 7
        { title: 'NOSI', data: 'nosiNumber', defaultContent: '' }, // 8
      ],

      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Export All Results',
          text: '<i class="fas fa-file-download me-1"></i>Export All Results',
          filename: 'fs-funding-list-grants',
          title: null,
          header: true,
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] }
        }
      ],
      fixedColumns: {
        left: 3,
        right: 1
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
    { applId: 1001, fullGrantNum: 'R01CA123456-01', piFullName: 'Smith, John A.', piEmail: 'john.smith@nih.gov', lastName: 'Smith', orgName: 'Johns Hopkins University', projectTitle: 'Novel Biomarkers in Colorectal Cancer', doc: 'DCB', formattedCouncilMeetingDate: '2025/02', rfaPaNumber: 'PA-24-001', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-24-001' },
    { applId: 1002, fullGrantNum: 'R21CA234567-01', piFullName: 'Johnson, Mary B.', piEmail: 'mary.johnson@nih.gov', lastName: 'Johnson', orgName: 'Stanford University', projectTitle: 'Immunotherapy Response Prediction', doc: 'DCP', formattedCouncilMeetingDate: '2025/02', rfaPaNumber: 'RFA-CA-24-010', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: '' },
    { applId: 1003, fullGrantNum: 'U01CA345678-01', piFullName: 'Williams, Robert C.', piEmail: 'r.williams@nih.gov', lastName: 'Williams', orgName: 'University of Michigan', projectTitle: 'Multi-Center Lung Cancer Screening Trial', doc: 'DCCPS', formattedCouncilMeetingDate: '2025/06', rfaPaNumber: 'RFA-CA-24-020', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-24-002' },
    { applId: 1004, fullGrantNum: 'R01CA456789-02', piFullName: 'Brown, Patricia D.', piEmail: 'p.brown@nih.gov', lastName: 'Brown', orgName: 'MD Anderson Cancer Center', projectTitle: 'Epigenetic Regulation in Breast Cancer Metastasis', doc: 'DCB', formattedCouncilMeetingDate: '2025/06', rfaPaNumber: 'PA-24-002', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: '' },
    { applId: 1005, fullGrantNum: 'P50CA567890-01', piFullName: 'Davis, Michael E.', piEmail: 'm.davis@nih.gov', lastName: 'Davis', orgName: 'Memorial Sloan Kettering', projectTitle: 'SPORE in Prostate Cancer', doc: 'DCP', formattedCouncilMeetingDate: '2025/10', rfaPaNumber: 'RFA-CA-24-030', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-24-003' },
    { applId: 1006, fullGrantNum: 'R03CA678901-01', piFullName: 'Martinez, Linda F.', piEmail: 'l.martinez@nih.gov', lastName: 'Martinez', orgName: 'University of Texas', projectTitle: 'Pilot Study: Pancreatic Cancer Early Detection', doc: 'DCCPS', formattedCouncilMeetingDate: '2025/10', rfaPaNumber: 'PA-24-003', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: '' },
    { applId: 1007, fullGrantNum: 'R01CA789012-01', piFullName: 'Wilson, James G.', piEmail: 'j.wilson@nih.gov', lastName: 'Wilson', orgName: 'Yale University', projectTitle: 'CAR-T Cell Engineering for Hematologic Malignancies', doc: 'DCB', formattedCouncilMeetingDate: '2026/02', rfaPaNumber: 'RFA-CA-24-040', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: '' },
    { applId: 1008, fullGrantNum: 'U54CA890123-01', piFullName: 'Anderson, Susan H.', piEmail: 's.anderson@nih.gov', lastName: 'Anderson', orgName: 'Harvard Medical School', projectTitle: 'NCI Physical Sciences Oncology Center', doc: 'DCCPS', formattedCouncilMeetingDate: '2026/02', rfaPaNumber: 'RFA-CA-24-050', nihGuideAddr: 'https://grants.nih.gov', nosiNumber: 'NOT-CA-24-004' },
  ];

  ajaxCall($this: CreateFundingTableComponent, dataTablesParameters: any, callback: any): void {
    if (!$this.showResults) {
      callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      return;
    }

    // TODO: remove mock data and restore real API call below
    const start = dataTablesParameters.start || 0;
    const length = dataTablesParameters.length || 10;
    const mockSlice = CreateFundingTableComponent.MOCK_DATA.slice(start, start + length);
    callback({ recordsTotal: CreateFundingTableComponent.MOCK_DATA.length, recordsFiltered: CreateFundingTableComponent.MOCK_DATA.length, data: mockSlice });
    return;

    const criteria: FundSelectSearchCriteria = {
      ...$this.searchCriteria,
      params: dataTablesParameters
    };

    $this.loaderService.show();
    $this.fsSearchControllerService.searchFsGrants(criteria).subscribe(
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
        $this.logger.error('CreateFundingTableComponent: grant search error', error);
        callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      }
    );
  }

  addSelectedToList(): void {
    const selectedGrants = Array.from(this.selectedRows.values());
    this.logger.debug('CreateFundingTableComponent: adding grants to list', selectedGrants);
    // TODO: integrate with funding list save API
  }

  get hasSelectedGrants(): boolean {
    return this.selectedRows.size > 0;
  }
}
