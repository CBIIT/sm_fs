import { AfterViewInit, ChangeDetectorRef, Component, EnvironmentInjector, OnDestroy, OnInit, TemplateRef, ViewChild, createComponent } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DataTableDirective } from 'angular-datatables';
import { Select2OptionData } from 'ng-select2';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { GrantDetailComponent } from '../search-lists/grant-detail/grant-detail.component';
import { FoaCellRendererComponent } from '../../table-cell-renderers/foa-cell-renderer/foa-cell-renderer.component';
import { FullGrantNumberCellRendererComponent } from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';

declare var $: any;

type NciTabId = 'all' | 'pending' | 'approved' | 'hold' | 'rejected' | 'recusals';

interface ProcessOption {
  label: 'Approve' | 'On Hold' | 'Reject';
  value: 'Approve' | 'Hold' | 'Rejected';
}

interface DocSummary {
  doc: string;
  recommendedTotal: number;
}

@Component({
  selector: 'app-funding-lists',
  templateUrl: './funding-lists.component.html',
  styleUrls: ['./funding-lists.component.css']
})
export class FundingListsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('foaCellRender') foaCellRender: TemplateRef<FoaCellRendererComponent>;
  @ViewChild('confirmDecisionsWarningModal') private confirmDecisionsWarningModalRef: TemplateRef<any>;

  pageTitle = '';
  listId = 0;
  status = '';
  listStatus = '';
  loadErrorMessage = '';
  totalNumberOfGrants = 0;
  docRecommendedTotal = 0;

  grantViewerUrl = '';
  eGrantsUrl = '';
  i2eURL = '';

  selectedTab: NciTabId = 'all';
  selectedDoc = '';
  selectedViewDoc: string = null;
  selectedRows = new Map<number, FundingSubmissionListGrantDto>();

  viewDocOptions: Select2OptionData[] = [
    { id: 'AB', text: 'Abstract(s)' },
    { id: 'SS', text: 'Summary Statement(s)' },
    { id: 'both', text: 'Abstract(s) and Summary Statement(s)' },
    { id: 'JST', text: 'Justification(s)' }
  ];

  readonly tabs: { id: NciTabId; label: string }[] = [
    { id: 'all', label: 'All Grants' },
    { id: 'pending', label: 'Pending Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'hold', label: 'On Hold' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'recusals', label: 'Recusals' }
  ];

  grants: FundingSubmissionListGrantDto[] = [];
  docRecommendedTotals: { [doc: string]: number } = {};

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  private confirmDecisionsModalRef: NgbModalRef;

  private detailComponentsByApplId = new Map<number, any>();

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private logger: NGXLogger,
    private environmentInjector: EnvironmentInjector,
    private propertiesService: AppPropertiesService,
    private loaderService: LoaderService,
    private fundingSubmissionsService: FundingSubmissionsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = (this.propertiesService.getProperty('I2EWEB_URL') || '').trim();

    this.route.queryParams.subscribe(params => {
      const routeListId = Number(params['listId']);
      if (!Number.isNaN(routeListId) && routeListId > 0) {
        this.listId = routeListId;
      }

      this.pageTitle = params['selectionDate'] || this.pageTitle;

      if (this.listId > 0) {
        this.loadErrorMessage = '';
        this.loadListMeta();
      } else {
        this.loadErrorMessage = 'Missing list id. Unable to load funding list.';
        this.clearListData();
      }
    });
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      processing: false,
      serverSide: false,
      scrollX: true,
      scrollY: '70vh',
      scrollCollapse: true,
      autoWidth: false,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" title="Last"></i>'
        }
      },
      ajax: (_params: any, callback: any) => {
        const data = this.filteredGrants;
        callback({
          data,
          recordsTotal: data.length,
          recordsFiltered: data.length
        });
      },
      columns: [
        {
          title: '',
          data: 'applId',
          orderable: false,
          width: '30px',
          className: 'all',
          defaultContent: '',
          render: (data: number) => `<input type="checkbox" class="grant-select-checkbox" data-appl-id="${data ?? ''}" aria-label="Select grant">`
        },
        {
          title: 'DOC',
          data: 'doc',
          width: '50px',
          defaultContent: ''
        },
        {
          title: 'PI',
          data: 'piName',
          width: '130px',
          defaultContent: '',
          render: (data: string, _t: any, row: any) => {
            if (!data) return '';
            const subject = this.getPiMailSubject(row);
            return `<a href="mailto:${row.piEmail}?subject=${encodeURIComponent(subject)}">${data}</a>`;
          }
        },
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '140px',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer },
          className: 'all'
        },
        {
          title: 'Institution',
          data: 'institution',
          width: '150px',
          defaultContent: ''
        },
        {
          title: 'Project Title',
          data: 'projectTitle',
          width: '180px',
          defaultContent: ''
        },
        {
          title: 'Abs',
          data: 'abstractAvailable',
          width: '40px',
          defaultContent: '',
          render: (data: boolean, _t: any, row: any) =>
            data ? `<a href="#" class="doc-open-link" data-doc-type="AB" data-appl-id="${row.applId}">Y</a>` : ''
        },
        {
          title: 'SS',
          data: 'summaryStatementAvailable',
          width: '40px',
          defaultContent: '',
          render: (data: boolean, _t: any, row: any) =>
            data ? `<a href="#" class="doc-open-link" data-doc-type="SS" data-appl-id="${row.applId}">Y</a>` : ''
        },
        {
          title: 'Justification',
          data: 'justificationAvailable',
          width: '90px',
          defaultContent: '',
          render: (data: boolean, _t: any, row: any) =>
            data ? `<a href="#" class="doc-open-link" data-doc-type="JST" data-appl-id="${row.applId}">Y</a>` : ''
        },
        {
          title: 'Review status',
          data: 'reviewStatus',
          width: '100px',
          defaultContent: '',
          render: (data: string | null | undefined, type: string, row: FundingSubmissionListGrantDto): string | null | undefined => {
            if (type === 'display') {
              const statusText = FundingListsComponent.escapeReviewStatusHtml(data || '');
              const dateText = FundingListsComponent.formatReviewStatusDate(row?.reviewStatusDate);
              if (!statusText) {
                return '';
              }
              if (!dateText) {
                return `<div>${statusText}</div>`;
              }
              return `<div>${statusText}</div><div class="text-muted">${FundingListsComponent.escapeReviewStatusHtml(dateText)}</div>`;
            }
            if (type === 'filter') {
              return FundingListsComponent.formatReviewStatusWithDate(data, row?.reviewStatusDate);
            }
            return data;
          }
        },
        {
          title: 'ESI',
          data: 'esiFlag',
          width: '50px',
          defaultContent: '',
          render: (data: boolean) => data === true ? 'Yes' : data === false ? 'No' : ''
        },
        {
          title: 'NCI Decision',
          data: 'nciDecision',
          width: '90px',
          defaultContent: ''
        },
        {
          title: 'DOC Decision',
          data: 'docDecision',
          width: '90px',
          defaultContent: ''
        },
        {
          title: 'DOC Priority',
          data: 'docPriority',
          width: '80px',
          defaultContent: ''
        },
        {
          title: 'DOC/NCI Sel',
          data: 'docNciSelectionName',
          width: '100px',
          defaultContent: '',
          render: (_data: string, _t: any, row: FundingSubmissionListGrantDto) => this.getDocNciSelectionDisplay(row)
        },
        {
          title: 'Annual or MYF',
          data: 'annualOrMyfName',
          width: '90px',
          defaultContent: '',
          render: (_data: string, _t: any, row: FundingSubmissionListGrantDto) => this.getAnnualOrMyfDisplay(row)
        },
        {
          title: 'Recused',
          data: 'recusedFlag',
          width: '70px',
          defaultContent: '',
          render: (data: boolean) => data ? 'Y' : ''
        },
        {
          title: 'Action',
          data: null,
          orderable: false,
          width: '120px',
          className: 'all',
          render: (_data: any, _type: any, row: FundingSubmissionListGrantDto) => {
            const applId = Number(row?.applId);
            const expandedIcon = this.detailComponentsByApplId.has(applId) ? 'fa-minus-circle' : 'fa-plus-circle';
            const options = this.getProcessOptionsForGrant(row)
              .map(option => `<button type="button" class="dropdown-item process-option" data-appl-id="${applId}" data-decision="${option.value}">${option.label}</button>`)
              .join('');
            const disabledClass = options ? '' : ' disabled';

            return `
              <div class="d-flex flex-column align-items-center gap-1 action-cell-wrap">
                <button class="btn btn-link p-0 toggle-details d-block mx-auto" title="Details" data-appl-id="${applId}">
                  <i class="far ${expandedIcon} fa-lg"></i>
                </button>
                <div class="btn-group process-dropdown-wrap">
                  <button type="button" class="btn btn-sm btn-outline-secondary process-toggle${disabledClass}" data-appl-id="${applId}">
                    Process <i class="far fa-chevron-down"></i>
                  </button>
                  <div class="dropdown-menu process-menu">
                    ${options}
                  </div>
                </div>
              </div>
            `;
          }
        }
      ],
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel btn-export-all',
          titleAttr: 'Export',
          text: 'Export',
          title: null,
          header: true,
          exportOptions: {
            columns: Array.from({ length: 17 }, (_v, i) => i + 1)
          }
        }
      ],
      order: [[13, 'asc']],
      fixedColumns: { left: 1, right: 1 },
      rowCallback: (row: Node, data: FundingSubmissionListGrantDto) => {
        this.dtOptions.columns.forEach((column: any, ind: number) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell && cell.childNodes.length > 1) {
              $(cell.childNodes.item(0)).remove();
            }
          }
        });

        const checkbox = (row as HTMLElement).querySelector('.grant-select-checkbox') as HTMLInputElement | null;
        if (checkbox) {
          checkbox.checked = this.selectedRows.has(Number((data as any).applId));
        }
      },
      drawCallback: () => {
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
          dt.columns.adjust();
          this.bindSelectionEvents(dt);
          this.bindActionEvents(dt);
          this.bindDocLinkEvents(dt);
        });
      },
      initComplete: () => {
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => dt.columns.adjust());
      }
    };

    setTimeout(() => this.dtTrigger.next(null));
  }

  goToDirectorBulkEdit(): void {
    const selectedGrants = Array.from(this.selectedRows.values());
    if (!selectedGrants.length) {
      return;
    }

    this.router.navigate(['/funding-submissions/director-bulk-edit'], {
      queryParams: {
        listId: this.listId,
        selectionDate: this.pageTitle
      },
      state: {
        listId: this.listId,
        selectionDate: this.pageTitle,
        grants: selectedGrants
      }
    });
  }

  onConfirmDecisionsClick(): void {
    this.confirmDecisionsModalRef = this.modalService.open(this.confirmDecisionsWarningModalRef, { centered: true });
  }

  onCancelConfirmDecisions(): void {
    this.confirmDecisionsModalRef?.dismiss();
  }

  onProceedConfirmDecisions(): void {
    // Confirmation only for now; locking decisions is handled by the backend flow
    // once the endpoint is available for this page.
    this.confirmDecisionsModalRef?.close();
  }

  ngOnDestroy(): void {
    this.confirmDecisionsModalRef?.close();
    this.detailComponentsByApplId.forEach(componentRef => componentRef?.destroy?.());
    this.detailComponentsByApplId.clear();

    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

  selectTab(tabId: NciTabId): void {
    this.selectedTab = tabId;
    this.ensureSelectedDocIsAvailableForTab();
    this.clearSelections();
    this.reloadTable();
  }

  selectDoc(doc: string): void {
    this.selectedDoc = doc;
    this.clearSelections();
    this.reloadTable();
  }

  get canViewPdf(): boolean {
    return this.selectedRows.size > 0 && !!this.selectedViewDoc;
  }

  onViewDocChange(value: string | string[]): void {
    this.selectedViewDoc = Array.isArray(value) ? value[0] : value;
    this.cdr.markForCheck();
  }

  viewPDF(): void {
    const applIds = Array.from(this.selectedRows.keys());
    if (!applIds.length || !this.selectedViewDoc) {
      return;
    }

    if (this.selectedViewDoc === 'JST') {
      this.openGrantDocuments(applIds, 'justification-pdf');
      return;
    }

    this.openGrantDocuments(applIds, 'document-report', this.selectedViewDoc);
  }

  get tabTitle(): string {
    const current = this.tabs.find(tab => tab.id === this.selectedTab);
    return current ? current.label : 'All Grants';
  }

  get docs(): string[] {
    const docsForTab = this.grants
      .filter(grant => this.matchesTab(grant))
      .map(grant => String(grant.doc || '').trim())
      .filter(doc => !!doc);
    return Array.from(new Set(docsForTab)).sort();
  }

  get availableDocs(): string[] {
    return this.docs.filter(doc => this.getDocCount(doc) > 0);
  }

  get filteredGrants(): FundingSubmissionListGrantDto[] {
    return this.grants.filter(grant => {
      const tabMatch = this.matchesTab(grant);
      const docMatch = !this.selectedDoc || this.normalizeValue(grant.doc) === this.normalizeValue(this.selectedDoc);
      return tabMatch && docMatch;
    });
  }

  getTabCount(tabId: NciTabId): number {
    return this.grants.filter(grant => this.matchesTab(grant, tabId)).length;
  }

  getDocCount(doc: string): number {
    const normalizedDoc = this.normalizeValue(doc);
    return this.grants.filter(grant => {
      const tabMatch = this.matchesTab(grant);
      const docMatch = this.normalizeValue(grant.doc) === normalizedDoc;
      return tabMatch && docMatch;
    }).length;
  }

  get showSelectedDocSummary(): boolean {
    return !!this.selectedDoc;
  }

  get selectedDocSummary(): DocSummary {
    const selectedDoc = this.selectedDoc;
    const normalizedDoc = this.normalizeValue(selectedDoc);
    const docRows = this.grants.filter(grant =>
      this.isInNciDirectorReview(grant) && this.normalizeValue(grant.doc) === normalizedDoc
    );
    const recommendedTotal = docRows.reduce((sum, grant) => {
      const amount = Number(grant.docRecommendedAmount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    return {
      doc: selectedDoc,
      recommendedTotal
    };
  }

  private matchesTab(grant: FundingSubmissionListGrantDto, tabId: NciTabId = this.selectedTab): boolean {
    if (!this.isInNciDirectorReview(grant)) {
      return false;
    }

    const decision = this.normalizeValue(grant.nciDecision);
    const recused = grant.recusedFlag === true;

    if (tabId === 'all') return true;
    if (tabId === 'pending') return !decision;
    if (tabId === 'approved') return decision === 'APPROVE';
    if (tabId === 'hold') return decision === 'HOLD';
    if (tabId === 'rejected') return decision === 'REJECTED';
    if (tabId === 'recusals') return recused;
    return true;
  }

  private isInNciDirectorReview(grant: FundingSubmissionListGrantDto): boolean {
    const reviewStatusCode = this.normalizeValue((grant as any)?.reviewStatusCode);
    if (reviewStatusCode) {
      return reviewStatusCode === 'DIRECTORREVIEW';
    }

    const reviewStatus = this.normalizeValue(grant?.reviewStatus);
    return reviewStatus.includes('DIRECTOR');
  }

  private normalizeValue(value: string | null | undefined): string {
    return (value || '').trim().toUpperCase();
  }

  private loadListMeta(): void {
    this.fundingSubmissionsService.getListDetail(this.listId).subscribe({
      next: (detail: any) => {
        this.loadErrorMessage = '';
        this.pageTitle = detail.listCode || this.pageTitle;
        this.status = detail.currentStatusDescrip || '';
        this.listStatus = detail.currentStatusDescrip || '';
        const grants = this.extractGrantsFromDetail(detail);
        this.totalNumberOfGrants = detail.totalGrants ?? grants.length;
        this.grants = grants;
        this.docRecommendedTotals = this.buildDocRecommendedTotals(this.grants);
        this.docRecommendedTotal = detail.totalDocRecAmt ?? Object.values(this.docRecommendedTotals).reduce((sum, amount) => sum + amount, 0);

        this.selectDefaultDirectorTab();
        this.ensureSelectedDocIsAvailableForTab();
        this.reloadTable();
      },
      error: err => {
        this.logger.error('Failed to load funding list detail', err);
        this.loadErrorMessage = 'Unable to load funding list data right now. Please try again.';
        this.clearListData();
      }
    });
  }

  private extractGrantsFromDetail(detail: any): FundingSubmissionListGrantDto[] {
    const candidates = [
      detail?.grants,
      detail?.fundingSubmissionListGrants,
      detail?.fundingSubmissionListGrantDtos,
      detail?.listGrants,
      detail?.items
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length) {
        return candidate as FundingSubmissionListGrantDto[];
      }
    }

    if (Array.isArray(detail?.grants)) {
      return detail.grants as FundingSubmissionListGrantDto[];
    }

    return [];
  }

  private clearListData(): void {
    this.status = '';
    this.listStatus = '';
    this.totalNumberOfGrants = 0;
    this.docRecommendedTotal = 0;
    this.grants = [];
    this.docRecommendedTotals = {};
    this.clearSelections();
    this.ensureSelectedDocIsAvailableForTab();
    this.reloadTable();
  }

  private buildDocRecommendedTotals(grants: FundingSubmissionListGrantDto[]): { [doc: string]: number } {
    return grants.reduce((acc: { [doc: string]: number }, grant: FundingSubmissionListGrantDto) => {
      if (!this.isInNciDirectorReview(grant)) {
        return acc;
      }

      const doc = String(grant.doc || '').trim();
      if (!doc) {
        return acc;
      }
      const amount = Number(grant.docRecommendedAmount ?? 0);
      acc[doc] = (acc[doc] || 0) + (Number.isFinite(amount) ? amount : 0);
      return acc;
    }, {});
  }

  private ensureSelectedDocIsAvailableForTab(): void {
    const availableSet = new Set(this.availableDocs.map(doc => this.normalizeValue(doc)));
    if (!this.selectedDoc || !availableSet.has(this.normalizeValue(this.selectedDoc))) {
      this.selectedDoc = this.availableDocs.length ? this.availableDocs[0] : '';
    }
  }

  private selectDefaultDirectorTab(): void {
    this.selectedTab = this.getTabCount('pending') > 0 ? 'pending' : 'all';
  }

  private bindSelectionEvents(dt: DataTables.Api): void {
    const $tableBody = $(dt.table(0).body());
    $tableBody
      .off('change', '.grant-select-checkbox')
      .on('change', '.grant-select-checkbox', (event: any) => {
        const checkbox = event.currentTarget as HTMLInputElement;
        const applId = Number(checkbox?.getAttribute('data-appl-id'));
        if (!Number.isFinite(applId)) {
          return;
        }

        const row = this.grants.find(grant => Number(grant.applId) === applId);
        if (!row) {
          return;
        }

        if (checkbox.checked) {
          this.selectedRows.set(applId, row);
        } else {
          this.selectedRows.delete(applId);
        }
        this.cdr.markForCheck();
      });
  }

  private bindDocLinkEvents(dt: DataTables.Api): void {
    const $tableBody = $(dt.table(0).body());
    $tableBody
      .off('click', '.doc-open-link')
      .on('click', '.doc-open-link', (event: any) => {
        event.preventDefault();
        event.stopPropagation();

        const $link = $(event.currentTarget);
        const applId = Number($link.data('appl-id'));
        const docType = String($link.data('doc-type') || '');

        if (!Number.isFinite(applId) || !docType) {
          return;
        }

        if (docType === 'JST') {
          this.openGrantDocuments([applId], 'justification-pdf');
          return;
        }

        this.openGrantDocuments([applId], 'document-report', docType);
      });
  }

  private bindActionEvents(dt: DataTables.Api): void {
    const $tableBody = $(dt.table(0).body());

    $tableBody
      .off('click', '.toggle-details')
      .on('click', '.toggle-details', (event: any) => {
        const $button = $(event.currentTarget);
        const applId = Number($button.data('appl-id'));
        const tr = $button.closest('tr');
        const row = dt.row(tr as any);

        if (!Number.isFinite(applId)) {
          return;
        }

        if (row.child.isShown()) {
          this.handleDetailRowClose(applId, row, tr, $button.find('i'));
        } else {
          const rowData = row.data() as FundingSubmissionListGrantDto;
          this.expandDetailRow(applId, row, tr, rowData, $button.find('i'));
        }
      });

    $tableBody
      .off('click', '.process-toggle')
      .on('click', '.process-toggle', (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        const $toggle = $(event.currentTarget);
        if ($toggle.hasClass('disabled')) {
          return;
        }
        const $menu = $toggle.siblings('.process-menu');
        $tableBody.find('.process-menu').not($menu).removeClass('show');
        $tableBody.find('td').removeClass('menu-open');
        $menu.toggleClass('show');
        if ($menu.hasClass('show')) {
          $toggle.closest('td').addClass('menu-open');
        }
      });

    $tableBody
      .off('click', '.process-option')
      .on('click', '.process-option', (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        const $option = $(event.currentTarget);
        const applId = Number($option.data('appl-id'));
        const decision = String($option.data('decision') || '');

        this.onProcessDecisionSelect(applId, decision as 'Approve' | 'Hold' | 'Rejected');
        $option.closest('.process-menu').removeClass('show');
        $option.closest('td').removeClass('menu-open');
        this.cdr.markForCheck();
      });

    $tableBody
      .off('click', 'td')
      .on('click', 'td', () => {
        $tableBody.find('.process-menu').removeClass('show');
        $tableBody.find('td').removeClass('menu-open');
      });
  }

  private getPiMailSubject(row: FundingSubmissionListGrantDto): string {
    const grant = row?.grantNumber || '';
    const piName = row?.piName || '';
    let lastName = piName;

    if (piName.includes(',')) {
      lastName = piName.split(',')[0].trim();
    } else {
      const parts = piName.trim().split(/\s+/);
      lastName = parts.length ? parts[parts.length - 1] : piName;
    }

    return `${grant} - ${lastName}`.trim();
  }

  private getDocNciSelectionDisplay(row: FundingSubmissionListGrantDto): string {
    const name = String(row?.docNciSelectionName || '').trim();
    if (name) {
      return name;
    }

    const code = this.normalizeValue(row?.docNciSelection);
    if (code === 'D') return 'DOC Selection';
    if (code === 'N') return 'NCI Selection';
    return '';
  }

  private getAnnualOrMyfDisplay(row: FundingSubmissionListGrantDto): string {
    const code = this.normalizeValue(row?.annualOrMyf);
    if (code === 'A') return 'AF';
    if (code === 'M') return 'MYF';

    const name = this.normalizeValue(row?.annualOrMyfName);
    if (name.includes('ANNUAL')) return 'AF';
    if (name.includes('MYF')) return 'MYF';
    return '';
  }

  private getProcessOptionsForGrant(grant: FundingSubmissionListGrantDto): ProcessOption[] {
    const allOptions: ProcessOption[] = [
      { label: 'Approve', value: 'Approve' },
      { label: 'On Hold', value: 'Hold' },
      { label: 'Reject', value: 'Rejected' }
    ];

    let options = allOptions;
    if (this.selectedTab === 'approved') {
      options = allOptions.filter(option => option.value !== 'Approve');
    } else if (this.selectedTab === 'hold') {
      options = allOptions.filter(option => option.value !== 'Hold');
    } else if (this.selectedTab === 'rejected') {
      options = allOptions.filter(option => option.value !== 'Rejected');
    }

    const currentDecision = this.normalizeValue(grant?.nciDecision);
    return options.filter(option => this.normalizeValue(option.value) !== currentDecision);
  }

  private onProcessDecisionSelect(applId: number, decision: 'Approve' | 'Hold' | 'Rejected'): void {
    if (!Number.isFinite(applId)) {
      return;
    }

    const row = this.grants.find(grant => Number(grant.applId) === applId);
    if (!row) {
      return;
    }

    row.nciDecision = decision;
    this.reloadTable();
  }

  private expandDetailRow(
    applId: number,
    row: any,
    tr: JQuery,
    rowData: FundingSubmissionListGrantDto,
    toggleIcon: JQuery
  ): void {
    const hostElement = document.createElement('div');
    hostElement.classList.add('detail-row-sticky');

    const componentRef = createComponent(GrantDetailComponent, {
      environmentInjector: this.environmentInjector,
      hostElement
    });

    componentRef.instance.data = rowData;
    componentRef.instance.listId = this.listId;
    componentRef.instance.listStatus = this.listStatus || 'DOC Review';
    componentRef.instance.close.subscribe(() => {
      this.handleDetailRowClose(applId, row, tr, toggleIcon);
    });
    componentRef.instance.editModeExited.subscribe(() => {
      // Keep expanded row visible on edit cancel.
    });
    componentRef.instance.saved.subscribe(() => {
      row.invalidate().draw(false);
    });

    componentRef.changeDetectorRef.detectChanges();
    this.detailComponentsByApplId.set(applId, componentRef);

    row.child(hostElement).show();
    tr.addClass('shown');
    toggleIcon.removeClass('fa-plus-circle').addClass('fa-minus-circle');
  }

  private handleDetailRowClose(applId: number, row: any, tr: JQuery, toggleIcon: JQuery): void {
    this.detailComponentsByApplId.get(applId)?.destroy?.();
    this.detailComponentsByApplId.delete(applId);

    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass('shown');
      toggleIcon.removeClass('fa-minus-circle').addClass('fa-plus-circle');
    }
  }

  private openGrantDocuments(applIds: number[], endpoint: 'document-report' | 'justification-pdf', docType?: string): void {
    const body = endpoint === 'justification-pdf' ? { applIds } : { applIds, docType };

    this.loaderService.show();
    this.http
      .post(`/i2efsws/api/v1/funding-submissions/lists/${this.listId}/${endpoint}`, body, { responseType: 'blob' })
      .pipe(finalize(() => this.loaderService.hide()))
      .subscribe({
        next: (blob: Blob) => {
          if (!blob || blob.size === 0) {
            return;
          }
          const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(pdfBlob);
          window.open(url, 'session');
          window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
        },
        error: (error: HttpErrorResponse) => {
          this.logger.error('Unable to open grant document PDF', error);
        }
      });
  }

  private clearSelections(): void {
    this.selectedRows.clear();
    this.detailComponentsByApplId.forEach(componentRef => componentRef?.destroy?.());
    this.detailComponentsByApplId.clear();
    this.cdr.markForCheck();
  }

  private reloadTable(): void {
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }

  private static formatReviewStatusWithDate(
    reviewStatus: string | null | undefined,
    reviewStatusDate: Date | string | null | undefined
  ): string {
    if (!reviewStatus) return '';
    const formattedDate = FundingListsComponent.formatReviewStatusDate(reviewStatusDate);
    return formattedDate ? `${reviewStatus} ${formattedDate}` : reviewStatus;
  }

  private static formatReviewStatusDate(reviewStatusDate: Date | string | null | undefined): string | null {
    if (reviewStatusDate == null || reviewStatusDate === '') return null;

    const date = reviewStatusDate instanceof Date ? reviewStatusDate : new Date(reviewStatusDate);
    if (Number.isNaN(date.getTime())) return null;

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = String(date.getFullYear()).padStart(4, '0');
    return `${mm}/${dd}/${yyyy}`;
  }

  private static escapeReviewStatusHtml(value: string): string {
    const escapedCharacters: { [character: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;'
    };
    return value.replace(/[&<>"']/g, character => escapedCharacters[character]);
  }
}
