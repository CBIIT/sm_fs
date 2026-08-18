import { AfterViewInit, Component, EnvironmentInjector, OnDestroy, OnInit, TemplateRef, ViewChild, createComponent } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { GrantDetailComponent } from './grant-detail/grant-detail.component';
import { Select2OptionData } from 'ng-select2';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { FoaCellRendererComponent } from '../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import { FullGrantNumberCellRendererComponent } from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';

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

  selectionDate = 'July 23';
  listId = 32124;
  listStatus = 'Draft';
  totalGrants = 400;
  docRecommendedTotal = 18000000;

  // Three columns × four rows to match the DOC Status grid layout
  docStatusColumns = [
    [
      { doc: 'CCG', count: 50, status: 'Draft' },
      { doc: 'CCT', count: 30, status: 'Draft' },
      { doc: 'CGH', count: 24, status: 'Draft' },
      { doc: 'CRCHD', count: 43, status: 'Draft' },
    ],
    [
      { doc: 'CSSI', count: 59, status: 'Draft' },
      { doc: 'DCB', count: 30, status: 'Draft' },
      { doc: 'DCCPS', count: 24, status: 'Draft' },
      { doc: 'DCP', count: 43, status: 'Draft' },
    ],
    [
      { doc: 'DCTD', count: 20, status: 'Draft' },
      { doc: 'OCC', count: 30, status: 'Draft' },
      { doc: 'OHAM', count: 40, status: 'Draft' },
      { doc: 'SBIR', count: 10, status: 'Draft' },
    ],
  ];

  listHistory = [
    { date: '1/1/2026 12:00am', status: 'Saved', actionBy: 'Doe, Jane' },
    { date: '1/1/2026 12:00am', status: 'Saved', actionBy: 'Doe, Jane' },
    { date: '1/1/2026 12:00am', status: 'Saved', actionBy: 'Doe, Jane' },
  ];

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  selectedViewDoc: string = null;
  viewDocOptions: Select2OptionData[] = [
    { id: 'abstracts', text: 'Abstract(s)' },
    { id: 'summaries', text: 'Summary Statement(s)' },
    { id: 'both', text: 'Abstract(s) and Summary Statement(s)' },
  ];

  // TODO: replace with real API data
  private readonly mockGrants = [
    { applId: 1001, grantNumber: '2R01CA259365-06', piName: 'Housley', piEmail: 'housley@nih.gov', institution: 'Johns Hopkins University', projectTitle: 'Novel Biomarkers in Colorectal Cancer', doc: 'DCB', ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost: 550774, i2Status: '-', budgetCategory: 'R01/R37', esiFlag: false, absFlag: true,  ssFlag: true,  justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'NCI Selection', twoYrFunding: null, annualOrMyf: 'Annual', recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 9:00',  addedBy: 'DOC' },
    { applId: 1002, grantNumber: '2R01CA259365-06', piName: 'Lytle',            piEmail: 'lytle@nih.gov',      institution: 'Stanford University',       projectTitle: 'Immunotherapy Response Prediction',            doc: 'DCB',   ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost: 712030,  i2Status: '-', budgetCategory: 'R01/R37', esiFlag: false, absFlag: true,  ssFlag: true,  justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'NCI Selection', twoYrFunding: null, annualOrMyf: 'Annual', recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 9:00',  addedBy: 'DOC' },
    { applId: 1003, grantNumber: '2R01CA259365-06', piName: 'Morris',           piEmail: 'morris@nih.gov',     institution: 'University of Michigan',    projectTitle: 'Multi-Center Lung Cancer Screening Trial',     doc: 'DCB',   ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost: 300112,  i2Status: '-', budgetCategory: 'R01/R37', esiFlag: false, absFlag: true,  ssFlag: true,  justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'NCI Selection', twoYrFunding: null, annualOrMyf: 'Annual', recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 9:00',  addedBy: 'DOC' },
    { applId: 1004, grantNumber: '2R01CA259365-06', piName: 'Wang',             piEmail: 'wang@nih.gov',       institution: 'MD Anderson Cancer Center', projectTitle: 'Epigenetic Regulation in Breast Cancer Metastasis', doc: 'DCTD', ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost: 50037,   i2Status: '-', budgetCategory: 'R03',    esiFlag: false, absFlag: true,  ssFlag: true,  justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'DOC Selection', twoYrFunding: null, annualOrMyf: 'Annual', recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 10:00', addedBy: 'OEFIA' },
    { applId: 1005, grantNumber: '2R01CA259365-06', piName: 'Zhang',            piEmail: 'zhang@nih.gov',      institution: 'Memorial Sloan Kettering',  projectTitle: 'SPORE in Prostate Cancer',                     doc: 'DCTD', ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost: 1200000, i2Status: '-', budgetCategory: 'R03',    esiFlag: true,  absFlag: false, ssFlag: true,  justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'DOC Selection', twoYrFunding: null, annualOrMyf: 'Annual', recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 10:00', addedBy: 'OEFIA' },
    { applId: 1006, grantNumber: 'R03CA678901-01', piName: 'Deng',              piEmail: 'deng@nih.gov',       institution: 'University of Texas',       projectTitle: 'Pilot Study: Pancreatic Cancer Early Detection', doc: 'DCTD', ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost: 75000,   i2Status: '-', budgetCategory: 'R03',    esiFlag: false, absFlag: false, ssFlag: false, justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'DOC Selection', twoYrFunding: null, annualOrMyf: 'MYF',    recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 10:00', addedBy: 'OEFIA' },
    { applId: 1007, grantNumber: 'R01CA789012-01', piName: 'Wilson, James G.',  piEmail: 'j.wilson@nih.gov',   institution: 'Yale University',           projectTitle: 'CAR-T Cell Engineering for Hematologic Malignancies', doc: 'DCB', ncabDate: '10/2026', percentile: 5,  priorityScore: 22, previousScore: 25, totalCost: 450000,  i2Status: '-', budgetCategory: 'R01',    esiFlag: false, absFlag: true,  ssFlag: true,  justFlag: false, reviewStatus: 'Draft', appTcEst: null, nciDecision: 'No',  docDecision: 'No', docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'DOC Selection', twoYrFunding: null, annualOrMyf: 'MYF',    recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 10:00', addedBy: 'OEFIA' },
    { applId: 1008, grantNumber: 'U54CA890123-01', piName: 'Anderson, Susan H.',piEmail: 's.anderson@nih.gov', institution: 'Harvard Medical School',    projectTitle: 'NCI Physical Sciences Oncology Center',        doc: 'DCCPS',ncabDate: '10/2026', percentile: 15, priorityScore: 28, previousScore: 22, totalCost: 2100000, i2Status: '-', budgetCategory: 'U54',    esiFlag: true,  absFlag: false, ssFlag: true,  justFlag: true,  reviewStatus: 'Draft', appTcEst: null, nciDecision: 'Yes', docDecision: 'Yes',docPriority: null, docRecAmt: 791000, docRecPctRed: 17, docNciSel: 'NCI Selection', twoYrFunding: null, annualOrMyf: 'Annual', recused: null, nofo: 'PA23-261', dateAdded: '5/10/2027 10:00', addedBy: 'DOC' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private logger: NGXLogger,
    private environmentInjector: EnvironmentInjector,
    private propertiesService: AppPropertiesService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['selectionDate']) {
        this.selectionDate = params['selectionDate'];
      }
    });
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = this.propertiesService.getProperty('I2EWEB_URL').trim();
    this.logger.debug('SearchListsComponent selectionDate:', this.selectionDate);
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: false,
      processing: false,
      data: this.mockGrants,
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
          render: (data: boolean) => data ? '<a href="#">Y</a>' : ''
        }, // 1
        {
          title: 'SS',
          data: 'ssFlag',
          width: '40px',
          defaultContent: '',
          render: (data: boolean) => data ? '<a href="#">Y</a>' : ''
        }, // 2
        {
          title: 'Justification',
          data: 'justFlag',
          width: '90px',
          defaultContent: '',
          render: (data: boolean) => data ? '<a href="#">Y</a>' : ''
        }, // 3
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '140px',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer },
          className: 'all'
        }, // 4
        {
          title: 'DOC',
          data: 'doc',
          width: '50px',
          defaultContent: ''
        }, // 5
        {
          title: 'Review Status',
          data: 'reviewStatus',
          width: '90px',
          defaultContent: ''
        }, // 6
        {
          title: 'Budget Categories',
          data: 'budgetCategory',
          width: '110px',
          defaultContent: ''
        }, // 7
        {
          title: 'PI',
          data: 'piName',
          width: '130px',
          render: (data: string, _t: any, row: any) => data ? `<a href="mailto:${row.piEmail}">${data}</a>` : ''
        }, // 8
        {
          title: 'IMPAC II Status',
          data: 'i2Status',
          width: '100px',
          defaultContent: ''
        }, // 9
        {
          title: 'NCAB',
          data: 'ncabDate',
          width: '70px',
          defaultContent: ''
        }, // 10
        {
          title: 'Pctl',
          data: 'percentile',
          width: '50px',
          defaultContent: '',
          render: (data: number) => data != null ? `${data}%` : ''
        }, // 11
        {
          title: 'Priority Score',
          data: 'priorityScore',
          width: '90px',
          defaultContent: ''
        }, // 12
        {
          title: 'ESI',
          data: 'esiFlag',
          width: '50px',
          render: (data: boolean) => data === true ? 'Yes' : data === false ? 'No' : ''
        }, // 13
        {
          title: 'Application TC Est',
          data: 'appTcEst',
          width: '110px',
          defaultContent: '-'
        }, // 14
        {
          title: 'NCI Decision',
          data: 'nciDecision',
          width: '90px',
          defaultContent: ''
        }, // 15
        {
          title: 'DOC Decision',
          data: 'docDecision',
          width: '90px',
          defaultContent: ''
        }, // 16
        {
          title: 'DOC Priority',
          data: 'docPriority',
          width: '80px',
          defaultContent: '-'
        }, // 17
        {
          title: 'DOC Rec. $',
          data: 'docRecAmt',
          width: '90px',
          defaultContent: '',
          render: (data: number) => data != null ? '$' + Number(data).toLocaleString('en-US') : '-'
        }, // 18
        {
          title: 'DOC Rec. % Red.',
          data: 'docRecPctRed',
          width: '95px',
          defaultContent: '',
          render: (data: number) => data != null ? `${data}%` : '-'
        }, // 19
        {
          title: 'DOC/NCI Sel',
          data: 'docNciSel',
          width: '100px',
          defaultContent: ''
        }, // 20
        {
          title: 'Two-Year Annual Funding R01 (HRHR)?',
          data: 'twoYrFunding',
          width: '160px',
          defaultContent: '-'
        }, // 21
        {
          title: 'Annual or MYF',
          data: 'annualOrMyf',
          width: '90px',
          defaultContent: ''
        }, // 22
        {
          title: 'Recused',
          data: 'recused',
          width: '70px',
          defaultContent: '',
          render: (data: any) => data || '-'
        }, // 23
        {
          title: 'NOFO',
          data: 'nofo',
          width: '80px',
          defaultContent: '',
          ngTemplateRef: { ref: this.foaCellRender }
        }, // 24
        {
          title: 'Date Added',
          data: 'dateAdded',
          width: '120px',
          defaultContent: ''
        }, // 25
        {
          title: 'Added By',
          data: 'addedBy',
          width: '80px',
          defaultContent: ''
        }, // 26
        {
          title: 'Action',
          data: null,
          orderable: false,
          width: '60px',
          className: 'all',
          defaultContent: '<button class="btn btn-link p-0 toggle-details" title="Details"><i class="far fa-plus-circle fa-lg"></i></button>'
        }, // 27
      ],
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        { extend: 'excel', className: 'btn-excel', titleAttr: 'Export All Results', text: 'Export All Results', filename: 'fs-funding-list-detail', title: null, header: true, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] } }
      ],
      order: [[4, 'asc']],
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
        $cb.off('click').on('click', () => $cb.toggleClass('selected'));
      },
      drawCallback: () => {
        setTimeout(() => {
          if (this.dtElement?.dtInstance) {
            this.dtElement.dtInstance.then((dt: DataTables.Api) => {

              dt.columns.adjust();

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

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }
}
