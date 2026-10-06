import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Select2OptionData } from 'ng-select2';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { FullGrantNumberCellRendererComponent } from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { NGXLogger } from 'ngx-logger';

declare var $: any;

interface DirectorBulkGrantRow {
  applId: number;
  grantNumber: string;
  piEmail?: string;
  institution?: string;
  institutionCity?: string;
  institutionState?: string;
  recused: string;
  doc: string;
  pi: string;
  percentile: number | null;
  priorityScore: number | null;
  esi: string;
  docPriority: number | null;
  docRecAmt: number | null;
  nciDecision: string | null;
  nciDirectorNotes: string;
}

@Component({
  selector: 'app-director-bulk-edit',
  templateUrl: './director-bulk-edit.component.html',
  styleUrls: ['./director-bulk-edit.component.css']
})
export class DirectorBulkEditComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;

  listId = 0;
  selectionDate = '';
  grantViewerUrl = '';
  eGrantsUrl = '';
  i2eURL = '';

  bulkDecision: string | null = null;
  bulkNotes = '';
  saveSuccessMessage = '';
  loadErrorMessage = '';
  canSave = false;

  rows: DirectorBulkGrantRow[] = [];
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  private lastSavedRows: DirectorBulkGrantRow[] = [];
  private pendingRealignFrame: number | null = null;

  decisionOptions: Select2OptionData[] = [
    { id: 'Approve', text: 'Approve' },
    { id: 'Hold', text: 'On Hold' },
    { id: 'Rejected', text: 'Reject' }
  ];

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = (this.propertiesService.getProperty('I2EWEB_URL') || '').trim();

    const state = history.state;
    const stateGrants = Array.isArray(state?.grants) ? state.grants : [];
    if (stateGrants.length) {
      this.setRows(this.mapSelectedGrants(stateGrants));
      return;
    }

    this.loadSelectedGrantsFromApi();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertiesService: AppPropertiesService,
    private fundingSubmissionsService: FundingSubmissionsService,
    private logger: NGXLogger
  ) {
    this.route.queryParams.subscribe(params => {
      this.listId = Number(params['listId'] || 0);
      this.selectionDate = params['selectionDate'] || '';
    });
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      lengthMenu: [10, 25, 50, 100],
      autoWidth: false,
      processing: false,
      scrollX: true,
      scrollCollapse: true,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" title="Last"></i>'
        }
      },
      ajax: (_params: any, callback: any) => {
        callback({ data: this.rows, recordsTotal: this.rows.length, recordsFiltered: this.rows.length });
      },
      columns: [
        {
          title: 'Grant Number',
          data: 'grantNumber',
          width: '180px',
          defaultContent: '',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer }
        },
        { title: 'Recused', data: 'recused', width: '70px', defaultContent: '-' },
        { title: 'DOC', data: 'doc', width: '70px', defaultContent: '' },
        {
          title: 'PI',
          data: 'pi',
          width: '140px',
          defaultContent: '',
          render: (data: string, _t: any, row: DirectorBulkGrantRow) => {
            if (!data || !row?.piEmail) return data || '';
            const subject = `${row.grantNumber || ''} - ${this.extractLastName(data)}`;
            return `<a href="mailto:${row.piEmail}?subject=${encodeURIComponent(subject)}">${data}</a>`;
          }
        },
        {
          title: 'Pctl',
          data: 'percentile',
          width: '70px',
          defaultContent: '',
          render: (value: number | null) => value == null ? '' : `${value}%`
        },
        { title: 'Priority Score', data: 'priorityScore', width: '95px', defaultContent: '' },
        { title: 'ESI', data: 'esi', width: '70px', defaultContent: '' },
        { title: 'DOC Priority', data: 'docPriority', width: '95px', defaultContent: '' },
        {
          title: 'DOC Rec. $',
          data: 'docRecAmt',
          width: '100px',
          defaultContent: '',
          render: (value: number | null) => value == null ? '' : `$${Number(value).toLocaleString('en-US')}`
        },
        {
          title: 'NCI Decision',
          data: 'nciDecision',
          width: '150px',
          defaultContent: '',
          ngTemplateRef: { ref: this.nciDecisionRenderer }
        },
        {
          title: 'NCI Notes',
          data: 'nciDirectorNotes',
          width: '270px',
          defaultContent: '',
          ngTemplateRef: { ref: this.nciNotesRenderer }
        }
      ],
      dom: '<"dt-controls dt-top"l<"ms-3"i><"ms-auto"B<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-export-all btn btn-outline-secondary btn-sm',
          titleAttr: 'Export All Results',
          text: 'Export All Results <i class="far fa-file-excel ms-1"></i>',
          title: null,
          header: true,
          exportOptions: {
            columns: Array.from({ length: 11 }, (_value, index) => index)
          }
        }
      ],
      rowCallback: (row: Node) => {
        this.dtOptions.columns.forEach((column: any, index: number) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(index);
            if (cell && cell.childNodes.length > 1) {
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      },
      drawCallback: () => {
        setTimeout(() => {
          this.dtElement?.dtInstance?.then((dt: DataTables.Api) => this.updateExportButtonState(dt));
          this.realignDataTableColumns();
        }, 0);
      },
      initComplete: () => {
        setTimeout(() => {
          this.dtElement?.dtInstance?.then((dt: DataTables.Api) => this.updateExportButtonState(dt));
          this.realignDataTableColumns();
        }, 0);
      }
    };

    setTimeout(() => this.dtTrigger.next(null));
  }

  @ViewChild('nciDecisionRenderer') nciDecisionRenderer: TemplateRef<any>;
  @ViewChild('nciNotesRenderer') nciNotesRenderer: TemplateRef<any>;

  ngOnDestroy(): void {
    if (this.pendingRealignFrame !== null) {
      window.cancelAnimationFrame(this.pendingRealignFrame);
      this.pendingRealignFrame = null;
    }
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.realignDataTableColumns();
  }

  private realignDataTableColumns(): void {
    if (this.pendingRealignFrame !== null) {
      window.cancelAnimationFrame(this.pendingRealignFrame);
    }

    this.pendingRealignFrame = window.requestAnimationFrame(() => {
      this.pendingRealignFrame = null;
      this.dtElement?.dtInstance?.then((dt: DataTables.Api) => {
        dt.columns.adjust();
      });
    });
  }

  private updateExportButtonState(dt: DataTables.Api): void {
    const exportButton = (dt as any).button('.btn-export-all');
    if (!exportButton || typeof exportButton.enable !== 'function') {
      return;
    }
    dt.rows().count() > 0 ? exportButton.enable() : exportButton.disable();
  }

  get backLabel(): string {
    return this.selectionDate ? `Back to ${this.selectionDate}` : 'Back to Lists';
  }

  get hasAnyBulkFieldValue(): boolean {
    return !!(this.bulkDecision || String(this.bulkNotes || '').trim());
  }

  onBackClick(): void {
    this.router.navigate(['/funding-submissions/funding-lists'], {
      queryParams: {
        listId: this.listId,
        selectionDate: this.selectionDate
      }
    });
  }

  resetBulkForm(): void {
    this.bulkDecision = null;
    this.bulkNotes = '';
    this.saveSuccessMessage = '';
    this.rows = JSON.parse(JSON.stringify(this.lastSavedRows));
    this.canSave = false;
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }

  applyChanges(): void {
    this.saveSuccessMessage = '';
    const shouldApplyDecision = !!this.bulkDecision;
    const shouldApplyNotes = !!String(this.bulkNotes || '').trim();

    if (!shouldApplyDecision && !shouldApplyNotes) {
      return;
    }

    this.rows.forEach(row => {
      if (shouldApplyDecision) {
        row.nciDecision = this.bulkDecision;
      }
      if (shouldApplyNotes) {
        row.nciDirectorNotes = this.bulkNotes;
      }
    });

    this.recomputeCanSave();
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }

  onRowChange(): void {
    this.recomputeCanSave();
  }

  onSave(): void {
    if (!this.canSave) {
      return;
    }

    this.lastSavedRows = JSON.parse(JSON.stringify(this.rows));
    this.canSave = false;
    this.saveSuccessMessage = 'Success! Bulk changes have been applied';
  }

  private recomputeCanSave(): void {
    this.canSave = this.rows.some(row => {
      const savedRow = this.lastSavedRows.find(item => item.applId === row.applId);
      if (!savedRow) {
        return true;
      }
      return row.nciDecision !== savedRow.nciDecision || row.nciDirectorNotes !== savedRow.nciDirectorNotes;
    });
  }

  private extractLastName(piName: string): string {
    const trimmed = String(piName || '').trim();
    if (!trimmed) {
      return '';
    }
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : trimmed;
  }

  private mapSelectedGrants(grants: any[]): DirectorBulkGrantRow[] {
    return grants.map(grant => ({
      applId: Number(grant.applId),
      grantNumber: grant.grantNumber || '',
      piEmail: grant.piEmail || '',
      institution: grant.institution || '',
      institutionCity: grant.institutionCity || '',
      institutionState: grant.institutionState || '',
      recused: grant.recusedFlag ? 'Y' : '-',
      doc: grant.doc || '',
      pi: grant.piName || '',
      percentile: grant.percentile ?? null,
      priorityScore: grant.priorityScore ?? null,
      esi: grant.esiFlag === true ? 'Yes' : grant.esiFlag === false ? 'No' : '',
      docPriority: grant.docPriority ?? null,
      docRecAmt: grant.docRecommendedAmount ?? null,
      nciDecision: grant.nciDecision ?? null,
      nciDirectorNotes: grant.nciDirectorNotes ?? ''
    }));
  }

  private loadSelectedGrantsFromApi(): void {
    if (!this.listId) {
      this.loadErrorMessage = 'Missing list id. Unable to load selected grants.';
      this.setRows([]);
      return;
    }

    this.loadErrorMessage = '';
    this.fundingSubmissionsService.getListDetail(this.listId).subscribe({
      next: (detail: any) => {
        const grants = this.extractGrantsFromDetail(detail);
        this.setRows(this.mapSelectedGrants(grants));
      },
      error: (err) => {
        this.logger.error('Failed to load grants for Director Bulk Edit', err);
        this.loadErrorMessage = 'Unable to load selected grants right now. Please return to the list and try again.';
        this.setRows([]);
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
      if (Array.isArray(candidate)) {
        return candidate as FundingSubmissionListGrantDto[];
      }
    }

    return [];
  }

  private setRows(rows: DirectorBulkGrantRow[]): void {
    this.rows = rows;
    this.lastSavedRows = JSON.parse(JSON.stringify(rows));
    this.canSave = false;
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }
}
