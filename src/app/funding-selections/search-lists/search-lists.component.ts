import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';

declare var $: any;

@Component({
  selector: 'app-search-lists',
  templateUrl: './search-lists.component.html',
  styleUrls: ['./search-lists.component.css']
})
export class SearchListsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;

  selectionDate = 'July 23';
  listId = 32124;
  listStatus = 'Draft';
  totalGrants = 400;
  docRecommendedTotal = 18000000;

  // Three columns × four rows to match the DOC Status grid layout
  docStatusColumns = [
    [
      { doc: 'CCG',   count: 50, status: 'Draft' },
      { doc: 'CCT',   count: 30, status: 'Draft' },
      { doc: 'CGH',   count: 24, status: 'Draft' },
      { doc: 'CRCHD', count: 43, status: 'Draft' },
    ],
    [
      { doc: 'CSSI',  count: 59, status: 'Draft' },
      { doc: 'DCB',   count: 30, status: 'Draft' },
      { doc: 'DCCPS', count: 24, status: 'Draft' },
      { doc: 'DCP',   count: 43, status: 'Draft' },
    ],
    [
      { doc: 'DCTD',  count: 20, status: 'Draft' },
      { doc: 'OCC',   count: 30, status: 'Draft' },
      { doc: 'OHAM',  count: 40, status: 'Draft' },
      { doc: 'SBIR',  count: 10, status: 'Draft' },
    ],
  ];

  listHistory = [
    { date: '1/1/2026 12:00am', status: 'Saved', actionBy: 'Doe, Jane' },
    { date: '1/1/2026 12:00am', status: 'Saved', actionBy: 'Doe, Jane' },
    { date: '1/1/2026 12:00am', status: 'Saved', actionBy: 'Doe, Jane' },
  ];

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  // TODO: replace with real API data
  private readonly mockGrants = [
    { applId: 1001, grantNumber: '2R01CA259365-06', piName: 'Housley',          piEmail: 'housley@nih.gov',    institution: 'Johns Hopkins University',           projectTitle: 'Novel Biomarkers in Colorectal Cancer',                        doc: 'DCB',   ncabDate: '10/2026', percentile: 13, priorityScore: 29, previousScore: 20, totalCost:  550774, i2Status: 'Pending', budgetCategory: 'R01', esiFlag: false },
    { applId: 1002, grantNumber: '2R01CA259365-06', piName: 'Lytle',            piEmail: 'lytle@nih.gov',      institution: 'Stanford University',                projectTitle: 'Immunotherapy Response Prediction',                           doc: 'DCB',   ncabDate: '10/2026', percentile: 10, priorityScore: 27, previousScore: 20, totalCost:  712030, i2Status: 'Pending', budgetCategory: 'R01', esiFlag: true  },
    { applId: 1003, grantNumber: '2R01CA259365-06', piName: 'Morris',           piEmail: 'morris@nih.gov',     institution: 'University of Michigan',             projectTitle: 'Multi-Center Lung Cancer Screening Trial',                    doc: 'DCB',   ncabDate: '10/2026', percentile: 11, priorityScore: 30, previousScore: 20, totalCost:  300112, i2Status: 'Pending', budgetCategory: 'R01', esiFlag: true  },
    { applId: 1004, grantNumber: '2R01CA259365-06', piName: 'Wang',             piEmail: 'wang@nih.gov',       institution: 'MD Anderson Cancer Center',          projectTitle: 'Epigenetic Regulation in Breast Cancer Metastasis',           doc: 'DCTD',  ncabDate: '10/2026', percentile:  8, priorityScore: 14, previousScore: 20, totalCost:   50037, i2Status: 'Pending', budgetCategory: 'R01', esiFlag: true  },
    { applId: 1005, grantNumber: 'P50CA567890-01',  piName: 'Davis, Michael E.',piEmail: 'm.davis@nih.gov',   institution: 'Memorial Sloan Kettering',           projectTitle: 'SPORE in Prostate Cancer',                                    doc: 'DCP',   ncabDate: '10/2026', percentile: 22, priorityScore: 35, previousScore: 30, totalCost: 1200000, i2Status: 'Awarded', budgetCategory: 'P50', esiFlag: false },
    { applId: 1006, grantNumber: 'R03CA678901-01',  piName: 'Martinez, Linda F.',piEmail:'l.martinez@nih.gov',institution: 'University of Texas',                projectTitle: 'Pilot Study: Pancreatic Cancer Early Detection',               doc: 'DCCPS', ncabDate: '10/2026', percentile: 18, priorityScore: 32, previousScore: 28, totalCost:   75000, i2Status: 'Pending', budgetCategory: 'R03', esiFlag: true  },
    { applId: 1007, grantNumber: 'R01CA789012-01',  piName: 'Wilson, James G.', piEmail: 'j.wilson@nih.gov',  institution: 'Yale University',                    projectTitle: 'CAR-T Cell Engineering for Hematologic Malignancies',         doc: 'DCB',   ncabDate: '10/2026', percentile:  5, priorityScore: 22, previousScore: 25, totalCost:  450000, i2Status: 'Pending', budgetCategory: 'R01', esiFlag: false },
    { applId: 1008, grantNumber: 'U54CA890123-01',  piName: 'Anderson, Susan H.',piEmail:'s.anderson@nih.gov',institution: 'Harvard Medical School',             projectTitle: 'NCI Physical Sciences Oncology Center',                      doc: 'DCCPS', ncabDate: '10/2026', percentile: 15, priorityScore: 28, previousScore: 22, totalCost: 2100000, i2Status: 'Awarded', budgetCategory: 'U54', esiFlag: true  },
  ];

  constructor(private router: Router, private logger: NGXLogger) {}

  ngOnInit(): void {
    const state = history.state;
    if (state?.selectionDate) {
      this.selectionDate = state.selectionDate;
    }
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.logger.debug('SearchListsComponent selectionDate:', this.selectionDate);
  }

  ngAfterViewInit(): void {
    const self = this;
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
          first:    '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next:     '<i class="far fa-chevron-right" title="Next"></i>',
          last:     '<i class="far fa-chevron-double-right" title="Last"></i>'
        }
      },
      columns: [
        { title: '',                data: 'applId',        orderable: false, width: '36px',  className: 'all select-checkbox', render: () => '' },
        { title: 'Grant Number',    data: 'grantNumber',   width: '150px', className: 'all', render: (data: string) => `<a href="#">${data}</a>` },
        { title: 'DOC',             data: 'doc',           width: '60px',  defaultContent: '' },
        { title: 'Budget Category', data: 'budgetCategory',width: '110px', defaultContent: '' },
        { title: 'PI',              data: 'piName',        width: '150px', render: (data: string, _t: any, row: any) => `<a href="mailto:${row.piEmail}">${data}</a>` },
        { title: 'IMPAC II Status', data: 'i2Status',      width: '110px', defaultContent: '' },
        { title: 'NCAB',            data: 'ncabDate',      width: '80px',  defaultContent: '' },
        { title: 'Pct',             data: 'percentile',    width: '55px',  defaultContent: '', render: (data: number) => data != null ? `${data}%` : '' },
        { title: 'Priority Score',  data: 'priorityScore', width: '100px', defaultContent: '' },
        {
          title: 'Action', data: null, orderable: false, width: '65px', className: 'all',
          defaultContent: '<button class="btn btn-link p-0 toggle-details" title="Details"><i class="fas fa-info-circle text-primary fa-lg"></i></button>'
        },
      ],
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        { extend: 'excel', className: 'btn-excel', titleAttr: 'Export All Results', text: 'Export All Results', filename: 'fs-funding-list-detail', title: null, header: true, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] } }
      ],
      order: [[1, 'asc']],
      rowCallback: (row: Node, data: any) => {
        const $cb = $('.select-checkbox', row);
        $cb.off('click').on('click', () => $cb.toggleClass('selected'));
      },
      drawCallback: () => {
        setTimeout(() => {
          if (self.dtElement?.dtInstance) {
            self.dtElement.dtInstance.then((dt: DataTables.Api) => {
              dt.columns.adjust();
              $(dt.table(0).body()).off('click', '.toggle-details').on('click', '.toggle-details', function() {
                const tr = $(this).closest('tr');
                const row = dt.row(tr);
                if (row.child.isShown()) {
                  row.child.hide();
                  tr.removeClass('shown');
                } else {
                  row.child(self.grantDetailHtml(row.data())).show();
                  tr.addClass('shown');
                }
              });
            });
          }
        }, 0);
      }
    };
    this.dtTrigger.next(null);
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

  private grantDetailHtml(row: any): string {
    const pct = row.percentile != null ? `${row.percentile}%` : '';
    const esi = row.esiFlag ? 'Yes' : 'No';
    const field = (lbl: string, val: string) =>
      `<div class="row mb-2"><div class="col-5 text-muted small fw-semibold">${lbl}</div><div class="col-7 small">${val}</div></div>`;
    const select = (lbl: string, extraCols = 7) =>
      `<div class="row mb-2 align-items-center"><label class="col-${12 - extraCols} col-form-label col-form-label-sm fw-semibold">${lbl}</label><div class="col-${extraCols}"><select class="form-select form-select-sm"><option>Select</option></select></div></div>`;
    return `
      <div class="grant-detail-container p-3">
        <div class="row g-3">
          <div class="col-md-5 border-end">
            <h6 class="fw-bold mb-3">Grant Information</h6>
            ${field('Grant Number',   row.grantNumber)}
            ${field('PI',             row.piName)}
            ${field('Project Title',  row.projectTitle)}
            ${field('Percentile',     pct)}
            ${field('DOC',            row.doc)}
            ${field('Institution',    row.institution)}
            ${field('NCAB',           row.ncabDate)}
            ${field('Impact Score',   row.priorityScore)}
            ${field('ESI',            esi)}
            ${field('Previous Score', row.previousScore)}
            <div class="mt-3">
              <button class="btn btn-sm btn-primary me-1">Edit</button>
              <button class="btn btn-sm btn-outline-secondary">Cancel</button>
            </div>
          </div>
          <div class="col-md-7">
            <h6 class="fw-bold mb-3">Funding Selections</h6>
            ${select('DOC Decision')}
            <div class="row mb-2 align-items-center">
              <label class="col-5 col-form-label col-form-label-sm fw-semibold">DOC Rec to Red</label>
              <div class="col-4"><input type="text" class="form-control form-control-sm" placeholder="Enter Value"></div>
              <label class="col-1 col-form-label col-form-label-sm fw-semibold ps-0 text-end">DOC Rec $</label>
              <div class="col-2"><select class="form-select form-select-sm"><option>Select</option></select></div>
            </div>
            <div class="row mb-2 align-items-center">
              <label class="col-5 col-form-label col-form-label-sm fw-semibold">DOC Priority</label>
              <div class="col-3"><select class="form-select form-select-sm"><option>Select</option></select></div>
              <label class="col-2 col-form-label col-form-label-sm fw-semibold text-end pe-0">FY Annual Full ROI</label>
              <div class="col-2"><select class="form-select form-select-sm"><option>Select</option></select></div>
            </div>
            ${select('Budget Categories')}
            <div class="row mb-2 align-items-center">
              <label class="col-5 col-form-label col-form-label-sm fw-semibold">Annual or MYF</label>
              <div class="col-3"><select class="form-select form-select-sm"><option>Select</option></select></div>
              <label class="col-2 col-form-label col-form-label-sm fw-semibold text-end pe-0">BDCI/MCI Decision</label>
              <div class="col-2"><select class="form-select form-select-sm"><option>Select</option></select></div>
            </div>
            <div class="row mb-2 align-items-center">
              <label class="col-5 col-form-label col-form-label-sm fw-semibold">DOC Notes <span class="fw-normal">(Optional)</span></label>
              <div class="col-7"><textarea class="form-control form-control-sm" rows="2"></textarea></div>
            </div>
            <div class="row mb-2 align-items-center">
              <label class="col-5 col-form-label col-form-label-sm fw-semibold">Justification <span class="fw-normal">(Optional)</span></label>
              <div class="col-7 d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-outline-secondary">Choose File</button>
                <span class="small text-muted">No file chosen</span>
              </div>
            </div>
            <div class="row mb-2 align-items-center">
              <label class="col-5 col-form-label col-form-label-sm fw-semibold">OEFM Notes <span class="fw-normal">(Optional)</span></label>
              <div class="col-7"><textarea class="form-control form-control-sm" rows="2"></textarea></div>
            </div>
            <div class="mt-3 text-end">
              <button class="btn btn-sm btn-outline-secondary me-1">Cancel</button>
              <button class="btn btn-sm btn-primary me-1">Save</button>
              <button class="btn btn-sm btn-outline-primary">Send to DOC Director</button>
            </div>
          </div>
        </div>
      </div>`;
  }
}
