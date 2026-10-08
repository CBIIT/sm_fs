import { AfterViewInit, ChangeDetectorRef, Component, EnvironmentInjector, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild, createComponent } from '@angular/core';
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
  @ViewChild('grantDecisionModal') private grantDecisionModalTemplateRef: TemplateRef<any>;

  pageTitle = '';
  listId = 0;
  status = '';
  listStatus = '';
  loadErrorMessage = '';
  totalNumberOfGrants = 0;
  docRecommendedTotal = 0;
  decisionSuccessMessage = '';

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

  get selectedTabLabel(): string {
    const selected = this.tabs.find(tab => tab.id === this.selectedTab);
    return selected?.label || 'Pending Review';
  }

  grants: FundingSubmissionListGrantDto[] = [];
  docRecommendedTotals: { [doc: string]: number } = {};

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  private confirmDecisionsModalRef: NgbModalRef;
  private grantDecisionModalRef: NgbModalRef;
  private pendingDecision: ProcessOption['value'] | null = null;
  private pendingDecisionGrant: FundingSubmissionListGrantDto | null = null;
  private pendingDecisionGrantNumber = '';
  pendingDecisionNote = '';
  pendingDecisionValidationMessage = '';
  private decisionsLocked = false;

  private detailComponentsByApplId = new Map<number, any>();
  private dragScrollContainerEl: HTMLElement | null = null;
  private dragScrollBodyEl: HTMLElement | null = null;
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private readonly processMenuOutsideClickNamespace = 'click.fundingListsProcessMenuOutside';
  private readonly dragScrollIgnoreSelector = 'a, button, input, select, textarea, label, thead, th, .dataTables_paginate, .dataTables_paginate *, .dt-paging-button, .select-checkbox, .toggle-details, .process-toggle, .process-option, .select2, .select2-container, .select2-selection, .select2-selection__rendered, .select2-selection__arrow';

  private readonly onHorizontalDragPointerDown = (event: PointerEvent): void => {
    if (!this.dragScrollBodyEl || !this.dragScrollContainerEl) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest(this.dragScrollIgnoreSelector)) {
      return;
    }

    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScrollLeft = this.dragScrollBodyEl.scrollLeft;
    this.dragScrollBodyEl.classList.add('dragging');
    this.dragScrollContainerEl.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onHorizontalDragPointerMove = (event: PointerEvent): void => {
    if (!this.dragScrollBodyEl) return;
    if (this.dragPointerId !== event.pointerId) return;

    const deltaX = event.clientX - this.dragStartX;
    this.dragScrollBodyEl.scrollLeft = this.dragStartScrollLeft - deltaX;
    event.preventDefault();
  };

  private readonly onHorizontalDragPointerEnd = (event: PointerEvent): void => {
    if (!this.dragScrollBodyEl || !this.dragScrollContainerEl) return;
    if (this.dragPointerId !== event.pointerId) return;

    this.dragScrollBodyEl.classList.remove('dragging');
    if (this.dragScrollContainerEl.hasPointerCapture(event.pointerId)) {
      this.dragScrollContainerEl.releasePointerCapture(event.pointerId);
    }
    this.dragPointerId = null;
  };

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
          className: 'all select-checkbox',
          defaultContent: '',
          render: () => ''
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
          width: '90px',
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
                <button class="btn btn-link p-0 toggle-details d-block mx-auto mb-3" title="Details" data-appl-id="${applId}">
                  <i class="far ${expandedIcon} fa-lg"></i>
                </button>
                <div class="btn-group process-dropdown-wrap">
                  <button type="button" class="btn btn-sm btn-outline-primary process-toggle${disabledClass}" data-appl-id="${applId}">
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

        const $cb = $('.select-checkbox', row);
        if (this.selectedRows.has(Number((data as any).applId))) {
          $cb.addClass('selected');
        } else {
          $cb.removeClass('selected');
        }
      },
      headerCallback: (thead: Node, _data: any[]) => {
        $('.select-checkbox', thead).removeClass('selected').off('click');
      },
      drawCallback: () => {
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
          dt.columns.adjust();
          this.syncExpandedDetailWidths(dt);
          this.bindHorizontalDragScroll(dt);
          this.bindSelectionEvents(dt);
          this.bindActionEvents(dt);
          this.bindDocLinkEvents(dt);
        });
      },
      initComplete: () => {
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
          dt.columns.adjust();
          this.bindHorizontalDragScroll(dt);
        });
      }
    };

    setTimeout(() => this.dtTrigger.next(null));
  }

  goToDirectorBulkEdit(): void {
    const selectedGrants = Array.from(this.selectedRows.values());
    if (!selectedGrants.length) {
      return;
    }

    const selectedApplIds = selectedGrants
      .map(grant => Number(grant?.applId))
      .filter(applId => Number.isFinite(applId) && applId > 0);

    this.router.navigate(['/funding-submissions/director-bulk-edit'], {
      queryParams: {
        listId: this.listId,
        selectionDate: this.pageTitle,
        selectedApplIds: selectedApplIds.join(',')
      },
      state: {
        listId: this.listId,
        selectionDate: this.pageTitle,
        grants: selectedGrants,
        selectedApplIds
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
    this.decisionsLocked = true;
    this.confirmDecisionsModalRef?.close();
    this.reloadTable();
  }

  ngOnDestroy(): void {
    this.unbindHorizontalDragScroll();
    $(document).off(this.processMenuOutsideClickNamespace);
    this.confirmDecisionsModalRef?.close();
    this.grantDecisionModalRef?.close();
    this.detailComponentsByApplId.forEach(componentRef => componentRef?.destroy?.());
    this.detailComponentsByApplId.clear();

    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
      dt.columns.adjust();
      this.syncExpandedDetailWidths(dt);
    });
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
    const $container = $(dt.table(0).container());
    this.stampCheckboxApplIds(dt, $container);

    $container
      .off('click.fundingSelectAll', 'thead .select-checkbox')
      .on('click.fundingSelectAll', 'thead .select-checkbox', () => {
        const $headers = $container.find('thead .select-checkbox');
        const shouldSelectAll = !$headers.first().hasClass('selected');

        if (!shouldSelectAll) {
          $headers.removeClass('selected');
          $container.find('tbody .select-checkbox').removeClass('selected');
          this.selectedRows.clear();
          this.cdr.markForCheck();
          return;
        }

        $headers.addClass('selected');
        $container.find('tbody .select-checkbox').addClass('selected');

        this.selectedRows.clear();
        const rows = dt.rows({ search: 'applied' }).data().toArray() as FundingSubmissionListGrantDto[];
        rows.forEach((row: FundingSubmissionListGrantDto) => {
          const applId = Number(row?.applId);
          if (Number.isFinite(applId)) {
            this.selectedRows.set(applId, row);
          }
        });

        this.cdr.markForCheck();
      });

    $container
      .off('click.fundingSelectRow', 'tbody .select-checkbox')
      .on('click.fundingSelectRow', 'tbody .select-checkbox', (event: any) => {
        const cell = event.currentTarget as HTMLElement;
        const applIdAttr = this.resolveCheckboxApplId(dt, cell);
        const applId = Number(applIdAttr);
        if (!Number.isFinite(applId)) {
          return;
        }

        const currentRows = dt.rows({ search: 'applied' }).data().toArray() as FundingSubmissionListGrantDto[];
        const rowData = currentRows.find((row: FundingSubmissionListGrantDto) => Number(row?.applId) === applId);
        if (!rowData) {
          return;
        }

        const shouldSelect = !$(cell).hasClass('selected');
        $container.find(`tbody .select-checkbox[data-applid="${applId}"]`).toggleClass('selected', shouldSelect);

        if (shouldSelect) {
          this.selectedRows.set(applId, rowData);
        } else {
          this.selectedRows.delete(applId);
        }

        this.syncHeaderSelectionState(dt, $container);
        this.cdr.markForCheck();
      });

    this.syncHeaderSelectionState(dt, $container);
  }

  private syncHeaderSelectionState(dt: DataTables.Api, container: JQuery<HTMLElement>): void {
    const rows = dt.rows({ search: 'applied' }).data().toArray() as FundingSubmissionListGrantDto[];
    const hasRows = rows.length > 0;
    const allSelected = hasRows && rows.every((row: FundingSubmissionListGrantDto) => {
      const applId = Number(row?.applId);
      return Number.isFinite(applId) && this.selectedRows.has(applId);
    });

    container.find('thead .select-checkbox').toggleClass('selected', allSelected);
  }

  private stampCheckboxApplIds(dt: DataTables.Api, container: JQuery<HTMLElement>): void {
    const currentRows = dt.rows({ page: 'current', order: 'current', search: 'applied' }).data().toArray() as FundingSubmissionListGrantDto[];
    container.find('tbody').each(function() {
      const $checkboxCells = $(this).find('td.select-checkbox');
      $checkboxCells.each((checkboxIndex: number, cellEl: Element) => {
        let applIdValue = '';
        const $row = $(cellEl).closest('tr');
        const dtRowIndexAttr = String($row.attr('data-dt-row') || '').trim();
        if (dtRowIndexAttr && !isNaN(Number(dtRowIndexAttr))) {
          const rowData = dt.row(Number(dtRowIndexAttr)).data() as FundingSubmissionListGrantDto;
          if (rowData?.applId != null) {
            applIdValue = String(rowData.applId);
          }
        }

        if (!applIdValue) {
          const applId = currentRows[checkboxIndex]?.applId;
          applIdValue = applId != null ? String(applId) : '';
        }

        $(cellEl).attr('data-applid', applIdValue);
      });
    });
  }

  private resolveCheckboxApplId(dt: DataTables.Api, checkboxEl: Element): string {
    const stampedApplId = String($(checkboxEl).attr('data-applid') || '').trim();
    if (stampedApplId) {
      return stampedApplId;
    }

    const $row = $(checkboxEl).closest('tr');
    const dtRowIndexAttr = String($row.attr('data-dt-row') || '').trim();
    if (dtRowIndexAttr && !isNaN(Number(dtRowIndexAttr))) {
      const rowData = dt.row(Number(dtRowIndexAttr)).data() as FundingSubmissionListGrantDto;
      if (rowData?.applId != null) {
        return String(rowData.applId);
      }
    }

    const checkboxIndex = $(checkboxEl).closest('tbody').find('td.select-checkbox').index(checkboxEl);
    const currentRows = dt.rows({ page: 'current', order: 'current', search: 'applied' }).data().toArray() as FundingSubmissionListGrantDto[];
    const fallbackRow = checkboxIndex >= 0 ? currentRows[checkboxIndex] : null;
    return fallbackRow?.applId != null ? String(fallbackRow.applId) : '';
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

    $(document)
      .off(this.processMenuOutsideClickNamespace)
      .on(this.processMenuOutsideClickNamespace, (event: any) => {
        const target = event?.target as HTMLElement | null;
        if (target?.closest('.process-dropdown-wrap')) {
          return;
        }

        this.closeOpenProcessMenus();
      });

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
        if (this.decisionsLocked) {
          return;
        }
        const $toggle = $(event.currentTarget);
        if ($toggle.hasClass('disabled')) {
          return;
        }

        const tr = $toggle.closest('tr');
        const row = dt.row(tr as any);
        const applId = Number($toggle.data('appl-id'));
        const rowData = row.data() as FundingSubmissionListGrantDto;

        if (Number.isFinite(applId)
          && rowData
          && this.shouldExpandDetailForProcessDropdown(dt, tr)) {
          this.ensureGrantRowExpanded(applId, row, tr, rowData);
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
        if (this.decisionsLocked) {
          return;
        }
        const $option = $(event.currentTarget);
        const applId = Number($option.data('appl-id'));
        const decision = String($option.data('decision') || '');
        const tr = $option.closest('tr');
        const row = dt.row(tr as any);
        const rowData = row.data() as FundingSubmissionListGrantDto;

        this.onProcessDecisionSelect(applId, decision as 'Approve' | 'Hold' | 'Rejected', undefined, undefined, rowData);
        $option.closest('.process-menu').removeClass('show');
        $option.closest('td').removeClass('menu-open');
        this.cdr.markForCheck();
      });

    $tableBody
      .off('click', 'td')
      .on('click', 'td', () => {
        this.closeOpenProcessMenus();
      });
  }

  private closeOpenProcessMenus(): void {
    $('.funding-lists-page .process-menu').removeClass('show');
    $('.funding-lists-page td.menu-open').removeClass('menu-open');
  }

  private shouldExpandDetailForProcessDropdown(dt: DataTables.Api, tr: JQuery): boolean {
    const currentRowElement = tr.get(0) as HTMLElement | undefined;
    if (!currentRowElement) {
      return false;
    }

    const visibleRows = (dt.rows({ search: 'applied' }).nodes().toArray() as HTMLElement[])
      .filter(rowEl => !rowEl.classList.contains('child'));

    if (!visibleRows.length) {
      return false;
    }

    if (visibleRows.length === 1) {
      return true;
    }

    return visibleRows[visibleRows.length - 1] === currentRowElement;
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
    return '';
  }

  private getAnnualOrMyfDisplay(row: FundingSubmissionListGrantDto): string {
    const code = this.normalizeValue(row?.annualOrMyf);
    if (code) return code;
    else {
      return '';
    }
  }

  private getProcessOptionsForGrant(grant: FundingSubmissionListGrantDto): ProcessOption[] {
    if (this.decisionsLocked) {
      return [];
    }

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

  private onProcessDecisionSelect(
    applId: number,
    decision: 'Approve' | 'Hold' | 'Rejected',
    row?: any,
    tr?: JQuery,
    rowData?: FundingSubmissionListGrantDto
  ): void {
    if (!Number.isFinite(applId) || this.decisionsLocked) {
      return;
    }

    const grantRow = rowData || this.grants.find(grant => Number(grant.applId) === applId);
    if (!grantRow) {
      return;
    }

    if (row && tr) {
      this.ensureGrantRowExpanded(applId, row, tr, grantRow);
    }

    this.openGrantDecisionModal(grantRow, decision);
  }

  onCancelGrantDecision(): void {
    this.pendingDecision = null;
    this.pendingDecisionGrant = null;
    this.pendingDecisionGrantNumber = '';
    this.pendingDecisionNote = '';
    this.pendingDecisionValidationMessage = '';
    this.grantDecisionModalRef?.dismiss();
  }

  onConfirmGrantDecision(): void {
    if (!this.pendingDecision || !this.pendingDecisionGrant) {
      return;
    }

    if ((this.pendingDecision === 'Hold' || this.pendingDecision === 'Rejected')
      && !String(this.pendingDecisionNote || '').trim()) {
      this.pendingDecisionValidationMessage = 'NCI Director Note is required.';
      return;
    }

    this.pendingDecisionValidationMessage = '';

    this.pendingDecisionGrant.nciDecision = this.pendingDecision;
    (this.pendingDecisionGrant as any).nciDirectorNotes = String(this.pendingDecisionNote || '').trim();

    const decisionText = this.pendingDecision === 'Approve'
      ? 'approved'
      : this.pendingDecision === 'Hold'
        ? 'placed on hold'
        : 'rejected';
    this.decisionSuccessMessage = `Success! Grant ${this.pendingDecisionGrantNumber} has been ${decisionText}.`;

    this.grantDecisionModalRef?.close();
    this.reloadTable();
  }

  get grantDecisionModalTitle(): string {
    if (this.pendingDecision === 'Approve') return 'Approve Grant';
    if (this.pendingDecision === 'Hold') return 'Place Grant On Hold';
    if (this.pendingDecision === 'Rejected') return 'Reject Grant';
    return 'Grant Decision';
  }

  get grantDecisionModalMessage(): string {
    if (this.pendingDecision === 'Approve') {
      return 'Clicking OK will approve this grant for funding. Are you sure you want to continue?';
    }
    if (this.pendingDecision === 'Hold') {
      return 'Clicking OK will place this grant on hold. Are you sure you want to continue?';
    }
    if (this.pendingDecision === 'Rejected') {
      return 'Clicking OK will reject this grant for funding. Are you sure you want to continue?';
    }
    return '';
  }

  get grantDecisionNotesLabel(): string {
    return this.pendingDecision === 'Approve' ? 'Add Notes (optional)' : 'Add Notes';
  }

  private openGrantDecisionModal(grant: FundingSubmissionListGrantDto, decision: ProcessOption['value']): void {
    this.pendingDecision = decision;
    this.pendingDecisionGrant = grant;
    this.pendingDecisionGrantNumber = String(grant?.grantNumber || '').trim();
    this.pendingDecisionNote = String((grant as any)?.nciDirectorNotes || '').trim();
    this.pendingDecisionValidationMessage = '';
    this.grantDecisionModalRef = this.modalService.open(this.grantDecisionModalTemplateRef, { centered: true });
  }

  private ensureGrantRowExpanded(applId: number, row: any, tr: JQuery, rowData: FundingSubmissionListGrantDto): void {
    if (row.child && row.child.isShown && row.child.isShown()) {
      return;
    }

    const toggleIcon = tr.find('.toggle-details i');
    this.expandDetailRow(applId, row, tr, rowData, toggleIcon);
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
    this.syncExpandedDetailWidths();
    this.scheduleTableLayoutSync();
    toggleIcon.removeClass('fa-plus-circle').addClass('fa-minus-circle');
  }

  private handleDetailRowClose(applId: number, row: any, tr: JQuery, toggleIcon: JQuery): void {
    this.detailComponentsByApplId.get(applId)?.destroy?.();
    this.detailComponentsByApplId.delete(applId);

    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass('shown');
      this.scheduleTableLayoutSync();
      toggleIcon.removeClass('fa-minus-circle').addClass('fa-plus-circle');
    }
  }

  private scheduleTableLayoutSync(): void {
    this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
      const relayout = (): void => {
        dt.columns.adjust();
        this.syncExpandedDetailWidths(dt);

        const fixedColumnsApi = (dt as any).fixedColumns?.();
        if (fixedColumnsApi && typeof fixedColumnsApi.relayout === 'function') {
          fixedColumnsApi.relayout();
        }
      };

      // Run twice to cover the moment the vertical scrollbar is introduced/removed.
      requestAnimationFrame(() => {
        relayout();
        requestAnimationFrame(() => relayout());
      });
    });
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

  private syncExpandedDetailWidths(dt?: DataTables.Api): void {
    const applyWidth = (container: HTMLElement | null): void => {
      if (!container) {
        return;
      }

      const scrollBody = container.querySelector('.dataTables_scrollBody') as HTMLElement | null;
      const detailRows = container.querySelectorAll('.detail-row-sticky') as NodeListOf<HTMLElement>;
      const width = scrollBody?.clientWidth || 0;

      if (!width || !detailRows.length) {
        return;
      }

      detailRows.forEach((detailRow: HTMLElement) => {
        detailRow.style.width = `${width}px`;
      });
    };

    if (dt) {
      applyWidth(dt.table(0).container() as HTMLElement | null);
      return;
    }

    this.dtElement?.dtInstance?.then((dtInstance: DataTables.Api) => {
      applyWidth(dtInstance.table(0).container() as HTMLElement | null);
    });
  }

  private bindHorizontalDragScroll(dt: DataTables.Api): void {
    const container = dt.table(0).container() as HTMLElement | null;
    const nextScrollBody = container?.querySelector('.dataTables_scrollBody') as HTMLElement | null;
    const nextDragContainer = container as HTMLElement | null;
    if (!nextScrollBody || !nextDragContainer) return;
    if (this.dragScrollBodyEl === nextScrollBody && this.dragScrollContainerEl === nextDragContainer) return;

    this.unbindHorizontalDragScroll();
    this.dragScrollContainerEl = nextDragContainer;
    this.dragScrollBodyEl = nextScrollBody;
    this.dragScrollBodyEl.classList.add('drag-scroll-enabled');
    this.dragScrollContainerEl.addEventListener('pointerdown', this.onHorizontalDragPointerDown);
    this.dragScrollContainerEl.addEventListener('pointermove', this.onHorizontalDragPointerMove);
    this.dragScrollContainerEl.addEventListener('pointerup', this.onHorizontalDragPointerEnd);
    this.dragScrollContainerEl.addEventListener('pointercancel', this.onHorizontalDragPointerEnd);
    this.dragScrollContainerEl.addEventListener('lostpointercapture', this.onHorizontalDragPointerEnd);
  }

  private unbindHorizontalDragScroll(): void {
    if (!this.dragScrollBodyEl && !this.dragScrollContainerEl) return;

    this.dragScrollBodyEl?.classList.remove('dragging');
    this.dragScrollBodyEl?.classList.remove('drag-scroll-enabled');
    this.dragScrollContainerEl?.removeEventListener('pointerdown', this.onHorizontalDragPointerDown);
    this.dragScrollContainerEl?.removeEventListener('pointermove', this.onHorizontalDragPointerMove);
    this.dragScrollContainerEl?.removeEventListener('pointerup', this.onHorizontalDragPointerEnd);
    this.dragScrollContainerEl?.removeEventListener('pointercancel', this.onHorizontalDragPointerEnd);
    this.dragScrollContainerEl?.removeEventListener('lostpointercapture', this.onHorizontalDragPointerEnd);

    this.dragScrollContainerEl = null;
    this.dragScrollBodyEl = null;
    this.dragPointerId = null;
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
