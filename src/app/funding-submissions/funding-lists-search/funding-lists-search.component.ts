import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { Select2OptionData } from 'ng-select2';
import { PdCaIntegratorService as LibPdCaIntegratorService } from '@cbiit/i2ecui-lib';
import {
  FundingSubmissionsControllerService,
  FundingSubmissionListSearchCriteriaDto,
  SelectionDateCodeDto,
  FundingSubmStatusCodesTDto
} from '@cbiit/i2efsws-lib';
import { DatatableThrottle } from '../../utils/datatable-throttle';
import { getCurrentFiscalYear } from '../../utils/utils';
import { FundingSubmissionsStateService } from '../funding-submissions-state.service';

declare var $: any;

@Component({
  selector: 'app-funding-lists-search',
  templateUrl: './funding-lists-search.component.html',
  styleUrls: ['./funding-lists-search.component.css']
})
export class FundingListsSearchComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('filterForm') filterForm: NgForm;
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;

  fiscalYear = getCurrentFiscalYear();
  pendingReviewCount = 0;
  showResults = false;

  selectedDocs: string[] = [];
  selectedListStatus: string = null;
  selectedSelectionDate: string = null;
  listIdFilter: string = null;

  selectionDateOptions: Select2OptionData[] = [];
  listIdOptions: Select2OptionData[] = [];
  listStatusOptions: Select2OptionData[] = [];

  private searchCriteria: FundingSubmissionListSearchCriteriaDto = {};
  private throttle = new DatatableThrottle();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  constructor(
    private router: Router,
    private logger: NGXLogger,
    private fundingSubmissionsService: FundingSubmissionsControllerService,
    private libPdCaIntegratorService: LibPdCaIntegratorService,
    private stateService: FundingSubmissionsStateService
  ) {}

  ngOnInit(): void {
    $.fn.DataTable.ext.pager.numbers_length = 5;
    this.fundingSubmissionsService.getSelectionDateCodes().subscribe({
      next: (dates: SelectionDateCodeDto[]) => {
        this.selectionDateOptions = dates.map(d => ({ id: d.code, text: d.name || d.description || d.code }));
      },
      error: (err) => this.logger.error('Failed to load selection dates', err)
    });
    this.fundingSubmissionsService.searchLists({ start: 0, length: 9999 }).subscribe({
      next: (result) => {
        const data = result.data || [];
        this.listIdOptions = data.map(item => ({
          id: String(item.listId),
          text: String(item.listId)
        }));
      },
      error: (err) => this.logger.error('Failed to load dropdown options', err)
    });
    this.fundingSubmissionsService.getListStatusCodes().subscribe({
      next: (codes: FundingSubmStatusCodesTDto[]) => {
        this.listStatusOptions = codes
          .filter(c => c.activeFlag)
          .map(c => ({ id: c.code, text: c.description }));
      },
      error: (err) => this.logger.error('Failed to load list status codes', err)
    });
    this.fundingSubmissionsService.searchLists({ listStatus: ['Pending Review'], start: 0, length: 0 }).subscribe({
      next: (result) => this.pendingReviewCount = result.recordsTotal ?? 0,
      error: (err) => this.logger.error('Failed to load pending review count', err)
    });
  }

  ngAfterViewInit(): void {
    this.libPdCaIntegratorService.caForDocEmitter.next({ code: [], channel: 'CA_DOC_DEFAULT_CHANNEL' });
    const saved = this.stateService.getSearchListsState();
    if (saved) {
      setTimeout(() => {
        this.selectedDocs = saved.selectedDocs;
        this.selectedListStatus = saved.selectedListStatus;
        this.selectedSelectionDate = saved.selectedSelectionDate;
        this.listIdFilter = saved.listIdFilter;
        this.filterForm?.form.patchValue(saved.formValue);
        if (saved.showResults) {
          this.searchCriteria = saved.searchCriteria;
          this.showResults = true;
          setTimeout(() => this.dtTrigger.next(null));
        }
      });
    }
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: true,
      processing: false,
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
      ajax: (dataTablesParameters: any, callback: any) => {
        this.throttle.invoke(this, dataTablesParameters, callback, this.ajaxCall);
      },
      columns: [
        {
          title: 'FY',
          data: 'fy',
          width: '60px',
          defaultContent: ''
        }, // 0
        {
          title: 'List ID',
          data: 'listId',
          width: '80px',
          defaultContent: ''
        }, // 1
        {
          title: 'Code',
          data: 'code',
          width: '130px',
          defaultContent: ''
        }, // 2
        {
          title: 'List Status',
          data: 'listStatus',
          width: '130px',
          defaultContent: ''
        }, // 3
        {
          title: 'Last Action Date',
          data: 'lastActionDate',
          width: '130px',
          defaultContent: '',
          render: (data: string) => {
            if (!data) return '';
            const d = new Date(data);
            if (isNaN(d.getTime())) return data;
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${mm}/${dd}/${d.getFullYear()}`;
          }
        }, // 4
        {
          title: 'Action',
          data: 'listId',
          orderable: false,
          width: '80px',
          defaultContent: '',
          render: (_data: number, _type: any, row: any) =>
            `<a href="javascript:void(0)" class="view-list-link" data-listid="${row.listId}" data-code="${row.code || ''}">View List</a>`
        }, // 5
      ],
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Export',
          text: 'Export',
          filename: 'fs-funding-lists',
          title: null,
          header: true,
          exportOptions: { columns: [0, 1, 2, 3, 4] }
        }
      ],
      order: [[4, 'desc']],
      drawCallback: () => {
        setTimeout(() => {
          this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
            dt.columns.adjust();
            $(dt.table(0).body())
              .off('click', '.view-list-link')
              .on('click', '.view-list-link', (e: any) => {
                const $el = $(e.currentTarget);
                this.router.navigate(['/funding-submissions/search'], {
                  queryParams: { listId: $el.data('listid'), selectionDate: $el.data('code'), from: 'lists' }
                });
              });
          });
        }, 0);
      },
    };
  }

  ajaxCall($this: FundingListsSearchComponent, dataTablesParameters: any, callback: any): void {
    const normalizeSearch = (s: any) => s ? { ...s, regex: s.regex === true || s.regex === 'true' } : s;
    const body: FundingSubmissionListSearchCriteriaDto = {
      ...$this.searchCriteria,
      draw: dataTablesParameters.draw,
      columns: (dataTablesParameters.columns || []).map((c: any) => ({ ...c, search: normalizeSearch(c.search) })),
      order: dataTablesParameters.order,
      start: dataTablesParameters.start,
      length: dataTablesParameters.length,
      search: normalizeSearch(dataTablesParameters.search)
    };
    $this.fundingSubmissionsService.searchLists(body).subscribe({
      next: (result) => {
        callback({ recordsTotal: result.recordsTotal, recordsFiltered: result.recordsFiltered, data: result.data });
      },
      error: (err) => {
        $this.logger.error('List search failed', err);
        callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
      }
    });
  }

  get hasSearchCriteria(): boolean {
    const fv = this.filterForm?.form?.value || {};
    const gn = fv.grantNumber || {};
    const fy = fv.fyRange || {};
    return !!(
      this.selectedSelectionDate ||
      this.listIdFilter ||
      this.selectedListStatus ||
      this.selectedDocs.length ||
      gn.grantNumberType || gn.grantNumberMech || gn.grantNumberIC ||
      gn.grantNumberSerial || gn.grantNumberYear || gn.grantNumberSuffix ||
      fy.fromFy || fy.toFy
    );
  }

  search(): void {
    const formValue = this.filterForm?.form.value || {};
    const grantNumber = formValue.grantNumber || {};
    const fyRange = formValue.fyRange || {};
    const toNum = (v: any): number | undefined => (v !== '' && v != null) ? Number(v) : undefined;

    this.searchCriteria = {
      grantType:            grantNumber.grantNumberType   || undefined,
      grantNumberMech:      grantNumber.grantNumberMech   || undefined,
      icCode:               grantNumber.grantNumberIC     || undefined,
      serialNumber:         grantNumber.grantNumberSerial || undefined,
      supportYear:          grantNumber.grantNumberYear   || undefined,
      suffixCode:           grantNumber.grantNumberSuffix || undefined,
      fyRangeFrom:          toNum(fyRange.fromFy),
      fyRangeTo:            toNum(fyRange.toFy),
      selectionCode:        this.selectedSelectionDate ? [this.selectedSelectionDate] : undefined,
      listId:               this.listIdFilter ? Number(this.listIdFilter) : undefined,
      listStatus:           this.selectedListStatus ? [this.selectedListStatus] : undefined,
      divisionOfficeCenter: this.selectedDocs.length ? this.selectedDocs : undefined,
    };

    this.throttle.reset();
    if (this.showResults) {
      this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
    } else {
      this.showResults = true;
      setTimeout(() => this.dtTrigger.next(null));
    }
  }

  onPendingReviewClick(): void {
    this.selectedListStatus = 'Pending Review';
    this.search();
  }

  onDocSelected(docs: string[]): void {
    this.selectedDocs = docs || [];
  }

  reset(): void {
    this.filterForm?.resetForm();
    this.selectedDocs = [];
    this.selectedListStatus = null;
    this.selectedSelectionDate = null;
    this.listIdFilter = null as any;
    this.showResults = false;
  }

  ngOnDestroy(): void {
    this.stateService.saveSearchListsState({
      formValue: this.filterForm?.form.value,
      selectedDocs: this.selectedDocs,
      selectedListStatus: this.selectedListStatus,
      selectedSelectionDate: this.selectedSelectionDate,
      listIdFilter: this.listIdFilter,
      searchCriteria: this.searchCriteria,
      showResults: this.showResults
    });
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }
}
