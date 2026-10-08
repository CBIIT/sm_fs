import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Select2OptionData } from 'ng-select2';
import { Subject } from 'rxjs';
import { DataTableDirective } from 'angular-datatables';
import { FullGrantNumberCellRendererComponent } from '../../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import {
  FundingSubmissionListGrantDto,
  FundingSubmissionNciDecisionRequestDto,
  FundingSubmissionsService,
  Item as NciDecisionItem
} from '@cbiit/i2efsws-lib';
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
  savingInProgress = false;

  rows: DirectorBulkGrantRow[] = [];
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  private lastSavedRows: DirectorBulkGrantRow[] = [];
  private pendingRealignFrame: number | null = null;
  private selectedApplIds = new Set<number>();

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
    this.selectedApplIds = this.parseSelectedApplIds(state?.selectedApplIds);
    if (!this.selectedApplIds.size) {
      this.selectedApplIds = this.parseSelectedApplIdsFromCsv(this.route.snapshot.queryParamMap.get('selectedApplIds'));
    }

    const stateGrants = Array.isArray(state?.grants) ? state.grants : [];
    if (stateGrants.length) {
      this.setRows(this.mapSelectedGrants(this.filterSelectedGrants(stateGrants)));
      return;
    }

    if (!this.selectedApplIds.size) {
      this.loadErrorMessage = 'No selected grants were provided. Please return to the list and select one or more grants.';
      this.setRows([]);
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
      dom: '<"dt-controls dt-top"l<"ms-3"i><"ms-auto"<"d-inline-block"p>>>rt<"dt-controls"<"me-auto"i>p>',
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
          this.realignDataTableColumns();
        }, 0);
      },
      initComplete: () => {
        setTimeout(() => {
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
    if (!this.canSave || this.savingInProgress) {
      return;
    }

    this.saveSuccessMessage = '';
    this.loadErrorMessage = '';

    const items = this.buildNciDecisionUpdateItems();
    if (!items.length) {
      this.canSave = false;
      return;
    }

    const missingDecisionRow = items.find(item => !item.nciDecision);
    if (missingDecisionRow) {
      const row = this.rows.find(entry => entry.applId === missingDecisionRow.applId);
      const grantLabel = row?.grantNumber ? ` for grant ${row.grantNumber}` : '';
      this.loadErrorMessage = `Please select an NCI Decision${grantLabel} before saving.`;
      return;
    }

    const request: FundingSubmissionNciDecisionRequestDto = { items };
    this.savingInProgress = true;

    this.fundingSubmissionsService.saveNciDecisions(request, this.listId).subscribe({
      next: () => {
        this.lastSavedRows = JSON.parse(JSON.stringify(this.rows));
        this.canSave = false;
        this.saveSuccessMessage = 'Success! Bulk changes have been applied';
        this.savingInProgress = false;
      },
      error: (err) => {
        this.logger.error('Failed to save Director Bulk Edit decisions', err);
        this.loadErrorMessage = this.getSaveErrorMessage(err);
        this.savingInProgress = false;
      }
    });
  }

  private buildNciDecisionUpdateItems(): NciDecisionItem[] {
    return this.rows.reduce((updates: NciDecisionItem[], row: DirectorBulkGrantRow) => {
      const savedRow = this.lastSavedRows.find(item => item.applId === row.applId);
      const decisionChanged = !savedRow || row.nciDecision !== savedRow.nciDecision;
      const notesChanged = !savedRow || row.nciDirectorNotes !== savedRow.nciDirectorNotes;

      if (!decisionChanged && !notesChanged) {
        return updates;
      }

      const nciDecision = this.toNciDecisionEnum(row.nciDecision);
      const update: NciDecisionItem = {
        applId: row.applId,
        nciDecision: nciDecision as NciDecisionItem.NciDecisionEnum
      };

      if (notesChanged) {
        update.nciDirectorNotes = row.nciDirectorNotes ?? '';
      }

      updates.push(update);
      return updates;
    }, []);
  }

  private toNciDecisionEnum(value: string | null): NciDecisionItem.NciDecisionEnum | null {
    if (value === 'Approve' || value === 'Hold' || value === 'Rejected') {
      return value;
    }

    return null;
  }

  private getSaveErrorMessage(err: any): string {
    const status = Number(err?.status);
    if (status === 400) return 'Unable to save. Please review NCI Decision/Notes values and try again.';
    if (status === 403) return 'You are not authorized to save NCI Director decisions.';
    if (status === 404) return 'Funding list or active membership was not found.';
    if (status === 409) return 'One or more grants are locked or no longer eligible for updates.';
    return 'Unable to save Director Bulk Edit changes right now. Please try again.';
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
        const grants = this.filterSelectedGrants(this.extractGrantsFromDetail(detail));
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

  private parseSelectedApplIds(candidate: any): Set<number> {
    if (Array.isArray(candidate)) {
      return new Set(
        candidate
          .map(value => Number(value))
          .filter(value => Number.isFinite(value) && value > 0)
      );
    }
    return new Set<number>();
  }

  private parseSelectedApplIdsFromCsv(csv: string | null): Set<number> {
    if (!csv) {
      return new Set<number>();
    }

    return new Set(
      csv
        .split(',')
        .map(token => Number(token.trim()))
        .filter(value => Number.isFinite(value) && value > 0)
    );
  }

  private filterSelectedGrants(grants: any[]): any[] {
    if (!this.selectedApplIds.size) {
      return grants || [];
    }

    return (grants || []).filter(grant => this.selectedApplIds.has(Number(grant?.applId)));
  }

  private setRows(rows: DirectorBulkGrantRow[]): void {
    this.rows = rows;
    this.lastSavedRows = JSON.parse(JSON.stringify(rows));
    this.canSave = false;
    this.dtElement?.dtInstance?.then(dt => dt.ajax.reload());
  }
}
