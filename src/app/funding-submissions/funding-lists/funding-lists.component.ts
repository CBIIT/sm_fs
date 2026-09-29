import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { Select2OptionData } from 'ng-select2';
import { FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';

declare var $: any;

interface FundingListGrantRow {
  grantNumber: string;
  abs: boolean;
  ss: boolean;
  justification: boolean;
  doc: string;
  reviewStatus: 'Pending Review' | 'Approved' | 'On Hold' | 'Rejected' | 'Recusal';
  budgetCategories: string;
  pi: string;
  impacStatus: string;
}

interface DocSummary {
  doc: string;
  recommendedTotal: number;
  approvedCount: number;
  rejectedCount: number;
  onHoldCount: number;
}

@Component({
  selector: 'app-funding-lists',
  templateUrl: './funding-lists.component.html',
  styleUrls: ['./funding-lists.component.css']
})
export class FundingListsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;

  pageTitle = '';
  listId = 0;
  status = '';
  totalNumberOfGrants = 0;
  docRecommendedTotal = 0;

  selectedTab = 'all';
  selectedDoc = 'All DOCs';
  selectedViewDoc: string = null;
  selectedRows = new Set<string>();
  expandedGrantNumbers = new Set<string>();

  viewDocOptions: Select2OptionData[] = [
    { id: 'AB', text: 'Abstract(s)' },
    { id: 'SS', text: 'Summary Statement(s)' },
    { id: 'both', text: 'Abstract(s) and Summary Statement(s)' },
    { id: 'JST', text: 'Justification(s)' }
  ];

  readonly processDecisionOptions: FundingListGrantRow['reviewStatus'][] = ['Approved', 'On Hold', 'Rejected'];

  readonly tabs = [
    { id: 'all', label: 'All Grants' },
    { id: 'pending', label: 'Pending Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'hold', label: 'On Hold' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'recusals', label: 'Recusal Institutions' }
  ];

  docRecommendedTotals: { [doc: string]: number } = {};
  grants: FundingListGrantRow[] = [];

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private logger: NGXLogger,
    private fundingSubmissionsService: FundingSubmissionsService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const routeListId = Number(params['listId']);
      if (!Number.isNaN(routeListId) && routeListId > 0) {
        this.listId = routeListId;
      }

      this.pageTitle = params['selectionDate'] || this.pageTitle;

      if (this.listId > 0) {
        this.loadListMeta();
      }
    });
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
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
          data: null,
          orderable: false,
          width: '30px',
          className: 'all',
          defaultContent: '',
          render: (_data: any, _type: any, row: FundingListGrantRow) =>
            `<input type="checkbox" class="grant-select-checkbox" data-grant-number="${row.grantNumber || ''}" aria-label="Select grant">`
        },
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '150px',
          defaultContent: '',
          render: (data: string) => `<a href="javascript:void(0)">${data || ''}</a>`
        },
        {
          title: 'Abs',
          data: 'abs',
          width: '55px',
          defaultContent: '',
          render: (data: boolean) => data ? 'Y' : ''
        },
        {
          title: 'SS',
          data: 'ss',
          width: '55px',
          defaultContent: '',
          render: (data: boolean) => data ? 'Y' : ''
        },
        {
          title: 'Jus.',
          data: 'justification',
          width: '55px',
          defaultContent: '',
          render: (data: boolean) => data ? 'Y' : ''
        },
        {
          title: 'DOC',
          data: 'doc',
          width: '60px',
          defaultContent: ''
        },
        {
          title: 'Review Status',
          data: 'reviewStatus',
          width: '150px',
          defaultContent: ''
        },
        {
          title: 'Budget Categories',
          data: 'budgetCategories',
          width: '120px',
          defaultContent: ''
        },
        {
          title: 'PI',
          data: 'pi',
          width: '110px',
          defaultContent: ''
        },
        {
          title: 'IMPAC II Status',
          data: 'impacStatus',
          width: '130px',
          defaultContent: ''
        },
        {
          title: 'Action',
          data: null,
          orderable: false,
          width: '180px',
          defaultContent: '',
          render: (_data: any, _type: any, row: FundingListGrantRow) => {
            const grantNumber = row?.grantNumber || '';
            const expandedIcon = this.expandedGrantNumbers.has(grantNumber) ? 'fa-minus-circle' : 'fa-plus-circle';
            const processOptions = this.processDecisionOptions
              .map(option => `<button type="button" class="dropdown-item process-option" data-grant-number="${grantNumber}" data-decision="${option}">${option}</button>`)
              .join('');
            return `
              <div class="d-flex flex-column align-items-center gap-1 action-cell-wrap">
                <button class="btn btn-link p-0 toggle-details" title="Details" data-grant-number="${grantNumber}">
                  <i class="far ${expandedIcon} fa-lg"></i>
                </button>
                <div class="btn-group process-dropdown-wrap">
                  <button type="button" class="btn btn-sm btn-outline-secondary process-toggle" data-grant-number="${grantNumber}">
                    Process <i class="far fa-chevron-down"></i>
                  </button>
                  <div class="dropdown-menu process-menu">
                    ${processOptions}
                  </div>
                </div>
              </div>
            `;
          }
        }
      ],
      dom: '<"dt-controls dt-top"l<"ms-4"i><"ms-auto"<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      rowCallback: (row: Node, data: FundingListGrantRow) => {
        const checkbox = (row as HTMLElement).querySelector('.grant-select-checkbox') as HTMLInputElement | null;
        if (checkbox) {
          checkbox.checked = this.selectedRows.has(data.grantNumber);
        }
      },
      drawCallback: () => {
        this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
          this.bindSelectionEvents(dt);
          this.bindActionEvents(dt);
        });
      }
    };

    setTimeout(() => this.dtTrigger.next(null));
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

  selectTab(tabId: string): void {
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

  // ng-select2 triggers through a jQuery event; mark for check to refresh disabled state reliably.
  onViewDocChange(value: string | string[]): void {
    this.selectedViewDoc = Array.isArray(value) ? value[0] : value;
    this.cdr.markForCheck();
  }

  viewPDF(): void {
    // Placeholder for API wiring once Funding Lists endpoint contract is finalized.
  }

  get tabTitle(): string {
    const current = this.tabs.find(tab => tab.id === this.selectedTab);
    return current ? current.label : 'All Grants';
  }

  get docs(): string[] {
    return Array.from(new Set(this.grants.map(grant => grant.doc).filter(doc => !!doc))).sort();
  }

  get availableDocs(): string[] {
    const docsForTab = this.docs.filter(doc => this.getDocCount(doc) > 0);
    return ['All DOCs', ...docsForTab];
  }

  get filteredGrants(): FundingListGrantRow[] {
    return this.grants.filter(grant => {
      const tabMatch = this.matchesTab(grant);
      const docMatch = this.selectedDoc === 'All DOCs' || this.normalizeValue(grant.doc) === this.normalizeValue(this.selectedDoc);
      return tabMatch && docMatch;
    });
  }

  getTabCount(tabId: string): number {
    return this.grants.filter(grant => this.matchesTab(grant, tabId)).length;
  }

  getDocCount(doc: string): number {
    if (doc === 'All DOCs') {
      return this.grants.filter(grant => this.matchesTab(grant)).length;
    }
    const normalizedDoc = this.normalizeValue(doc);
    return this.grants.filter(grant => {
      const tabMatch = this.matchesTab(grant);
      const docMatch = this.normalizeValue(grant.doc) === normalizedDoc;
      return tabMatch && docMatch;
    }).length;
  }

  get showSelectedDocSummary(): boolean {
    return this.selectedDoc !== 'All DOCs';
  }

  get selectedDocSummary(): DocSummary {
    const selectedDoc = this.selectedDoc;
    const normalizedDoc = this.normalizeValue(selectedDoc);
    const docRows = this.grants.filter(grant => this.normalizeValue(grant.doc) === normalizedDoc);

    const countByStatus = (status: FundingListGrantRow['reviewStatus']): number => {
      const normalizedStatus = this.normalizeValue(status);
      return docRows.filter(grant => this.normalizeValue(grant.reviewStatus) === normalizedStatus).length;
    };

    return {
      doc: selectedDoc,
      recommendedTotal: this.docRecommendedTotals[selectedDoc] || 0,
      approvedCount: countByStatus('Approved'),
      rejectedCount: countByStatus('Rejected'),
      onHoldCount: countByStatus('On Hold')
    };
  }

  private matchesTab(grant: FundingListGrantRow, tabId = this.selectedTab): boolean {
    const status = this.normalizeValue(grant.reviewStatus);
    if (tabId === 'all') {
      return true;
    }
    if (tabId === 'pending') {
      return status === this.normalizeValue('Pending Review');
    }
    if (tabId === 'approved') {
      return status === this.normalizeValue('Approved');
    }
    if (tabId === 'hold') {
      return status === this.normalizeValue('On Hold');
    }
    if (tabId === 'rejected') {
      return status === this.normalizeValue('Rejected');
    }
    if (tabId === 'recusals') {
      return status === this.normalizeValue('Recusal');
    }
    return true;
  }

  private normalizeValue(value: string): string {
    return (value || '').trim().toUpperCase();
  }

  private loadListMeta(): void {
    this.fundingSubmissionsService.getListDetail(this.listId).subscribe({
      next: (detail: any) => {
        this.pageTitle = detail.listCode || this.pageTitle;
        this.status = detail.currentStatusDescrip || '';
        this.totalNumberOfGrants = detail.totalGrants ?? 0;
        this.docRecommendedTotal = detail.totalDocRecAmt ?? 0;

        const detailGrants = (detail.grants || []) as FundingSubmissionListGrantDto[];
        this.grants = detailGrants.map(grant => this.mapGrantToRow(grant));
        this.docRecommendedTotals = this.buildDocRecommendedTotals(detailGrants);

        this.ensureSelectedDocIsAvailableForTab();
        this.reloadTable();
      },
      error: err => {
        this.logger.error('Failed to load funding list detail', err);
      }
    });
  }

  private mapGrantToRow(grant: FundingSubmissionListGrantDto): FundingListGrantRow {
    const decision = String((grant as any).nciDecision || '').trim().toLowerCase();
    let reviewStatus: FundingListGrantRow['reviewStatus'] = 'Pending Review';
    if (decision === 'approve') {
      reviewStatus = 'Approved';
    } else if (decision === 'hold') {
      reviewStatus = 'On Hold';
    } else if (decision === 'decline' || decision === 'reject' || decision === 'rejected') {
      reviewStatus = 'Rejected';
    }

    if ((grant as any).recusedFlag === true) {
      reviewStatus = 'Recusal';
    }

    return {
      grantNumber: String((grant as any).grantNumber || ''),
      abs: !!(grant as any).abstractAvailable,
      ss: !!(grant as any).summaryStatementAvailable,
      justification: !!(grant as any).justificationAvailable,
      doc: String((grant as any).doc || ''),
      reviewStatus,
      budgetCategories: String((grant as any).budgetCategories || ''),
      pi: String((grant as any).piName || ''),
      impacStatus: String((grant as any).impacStatusDescrip || '')
    };
  }

  private buildDocRecommendedTotals(grants: FundingSubmissionListGrantDto[]): { [doc: string]: number } {
    return grants.reduce((acc: { [doc: string]: number }, grant: any) => {
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
    if (this.selectedDoc === 'All DOCs') {
      return;
    }

    const availableSet = new Set(this.availableDocs.map(doc => this.normalizeValue(doc)));
    if (!availableSet.has(this.normalizeValue(this.selectedDoc))) {
      this.selectedDoc = 'All DOCs';
    }
  }

  private bindSelectionEvents(dt: DataTables.Api): void {
    const $tableBody = $(dt.table(0).body());
    $tableBody
      .off('change', '.grant-select-checkbox')
      .on('change', '.grant-select-checkbox', (event: any) => {
        const checkbox = event.currentTarget as HTMLInputElement;
        const grantNumber = checkbox?.getAttribute('data-grant-number') || '';
        if (!grantNumber) {
          return;
        }

        if (checkbox.checked) {
          this.selectedRows.add(grantNumber);
        } else {
          this.selectedRows.delete(grantNumber);
        }
        this.cdr.markForCheck();
      });
  }

  private bindActionEvents(dt: DataTables.Api): void {
    const $tableBody = $(dt.table(0).body());

    $tableBody
      .off('click', '.toggle-details')
      .on('click', '.toggle-details', (event: any) => {
        const $button = $(event.currentTarget);
        const grantNumber = String($button.data('grant-number') || '');
        const tr = $button.closest('tr');
        const row = dt.row(tr as any);
        if (!grantNumber) {
          return;
        }

        if (row.child.isShown()) {
          row.child.hide();
          tr.removeClass('shown');
          this.expandedGrantNumbers.delete(grantNumber);
          $button.find('i').removeClass('fa-minus-circle').addClass('fa-plus-circle');
        } else {
          const rowData = row.data() as FundingListGrantRow;
          row.child(this.buildDetailRowHtml(rowData)).show();
          tr.addClass('shown');
          this.expandedGrantNumbers.add(grantNumber);
          $button.find('i').removeClass('fa-plus-circle').addClass('fa-minus-circle');
        }
      });

    $tableBody
      .off('click', '.process-toggle')
      .on('click', '.process-toggle', (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        const $toggle = $(event.currentTarget);
        const $menu = $toggle.siblings('.process-menu');
        $tableBody.find('.process-menu').not($menu).removeClass('show');
        $menu.toggleClass('show');
      });

    $tableBody
      .off('click', '.process-option')
      .on('click', '.process-option', (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        const $option = $(event.currentTarget);
        const grantNumber = String($option.data('grant-number') || '');
        const decision = String($option.data('decision') || '');
        this.onProcessDecisionSelect(grantNumber, decision);
        $option.closest('.process-menu').removeClass('show');
        this.cdr.markForCheck();
      });

    $tableBody
      .off('click', 'td')
      .on('click', 'td', () => {
        $tableBody.find('.process-menu').removeClass('show');
      });
  }

  private buildDetailRowHtml(row: FundingListGrantRow): string {
    const pi = this.safeCellValue(row?.pi);
    const reviewStatus = this.safeCellValue(row?.reviewStatus);
    const budgetCategories = this.safeCellValue(row?.budgetCategories);
    const impacStatus = this.safeCellValue(row?.impacStatus);
    return `
      <div class="action-detail-row px-3 py-2">
        <div><strong>PI:</strong> ${pi}</div>
        <div><strong>Review Status:</strong> ${reviewStatus}</div>
        <div><strong>Budget Categories:</strong> ${budgetCategories}</div>
        <div><strong>IMPAC II Status:</strong> ${impacStatus}</div>
      </div>
    `;
  }

  private safeCellValue(value: string): string {
    return (value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private onProcessDecisionSelect(grantNumber: string, decision: string): void {
    if (!grantNumber || !decision) {
      return;
    }

    const nextStatus = decision as FundingListGrantRow['reviewStatus'];
    if (!this.processDecisionOptions.includes(nextStatus)) {
      return;
    }

    const row = this.grants.find(grant => grant.grantNumber === grantNumber);
    if (!row) {
      return;
    }

    row.reviewStatus = nextStatus;
    this.reloadTable();
  }

  private clearSelections(): void {
    this.selectedRows.clear();
    this.expandedGrantNumbers.clear();
    this.cdr.markForCheck();
  }

  private reloadTable(): void {
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }
}
