import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelect2Module } from 'ng-select2';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import {
  FundingSubmJustificationDto, FundingSubmListStatusHistoryDto, FundingSubmissionBulkEditRequestDto,
  FundingSubmissionDocPayDefaultsDto, FundingSubmissionListDetailDto, FundingSubmissionListGrantDto,
  FundingSubmissionRemoveGrantsFromListResultDto, FundingSubmissionsService
} from '@cbiit/i2efsws-lib';

import { AppUserSessionService } from '../../service/app-user-session.service';
import { roleNames } from '../../service/role-names';
import { DocumentService } from '../../service/document.service';
import { FundingSubmDropdownLookupService } from '../funding-subm-dropdown-lookup.service';
import { FUNDING_WRITE_RECOVERY_STORAGE, FundingWriteRecoveryService } from '../funding-write-recovery.service';
import { MemoryStorage } from '../testing/memory-storage';
import { installDataTables } from '../testing/install-datatables';
import { UserSelect2ChangeDirective } from '../user-select2-change.directive';
import { GrantDetailComponent } from './grant-detail/grant-detail.component';
import { SearchListsComponent } from './search-lists.component';

interface FundingServiceStub {
  getJustification(listId: number, applId: number): Observable<FundingSubmJustificationDto>;
  getDocPriorityOptions(listId: number, applId: number): Observable<number[]>;
  getDocPayDefaults(listId: number, applIds: number[]): Observable<FundingSubmissionDocPayDefaultsDto[]>;
  getBudgetCategoryOptions(applId: number): Observable<Array<{ code: string; name: string }>>;
  getListDetail(listId: number): Observable<FundingSubmissionListDetailDto>;
  getListStatusHistory(listId: number): Observable<FundingSubmListStatusHistoryDto[]>;
  bulkUpdateListGrants(body: FundingSubmissionBulkEditRequestDto, listId: number): Observable<number>;
  removeGrantsFromList(listId: number, applIds: number[]): Observable<FundingSubmissionRemoveGrantsFromListResultDto>;
}

describe('FS-2516 same-page DOC Priority resequencing', () => {
  let pageFixture: ComponentFixture<SearchListsComponent>;
  let page: SearchListsComponent;
  let funding: jasmine.SpyObj<FundingServiceStub>;
  let storage: MemoryStorage;
  let serverGrants: FundingSubmissionListGrantDto[];
  let detailFixtures: ComponentFixture<GrantDetailComponent>[];
  let order: jasmine.Spy;
  let currentOrder: Array<Array<string | number>>;

  function grant(applId: number, priority: number | null, overrides: Partial<FundingSubmissionListGrantDto> = {})
    : FundingSubmissionListGrantDto {
    return {
      applId, grantNumber: `GRANT-${applId}`, doc: 'DCB', docDecision: 'Pay', docPriority: priority,
      docRecommendedAmount: 90000, docRecommendedReductionPct: 10, originalRequestedTotal: 100000,
      docNotes: 'Stored note', oefiaNotes: '', addedByGroup: 'OEFIA', ...overrides
    };
  }

  function listDetail(): FundingSubmissionListDetailDto {
    return { grants: serverGrants.map(row => ({ ...row })), currentStatusDescrip: 'DOC Review' };
  }

  function openEditor(row: FundingSubmissionListGrantDto): GrantDetailComponent {
    const fixture = TestBed.createComponent(GrantDetailComponent);
    detailFixtures.push(fixture);
    const detail = fixture.componentInstance;
    detail.data = row;
    detail.listId = page.listId;
    detail.priorityCoordinator = (page as any).priorityCoordinator;
    (page as any).detailComponentsByApplId.set(row.applId, {
      instance: detail,
      changeDetectorRef: fixture.changeDetectorRef,
      location: { nativeElement: fixture.nativeElement },
      destroy: () => fixture.destroy()
    });
    fixture.detectChanges();
    detail.onEdit();
    expect(detail.isEditMode).toBeTrue();
    return detail;
  }

  function seedRows(rows: FundingSubmissionListGrantDto[]): void {
    serverGrants = rows.map(row => ({ ...row }));
    (page as any).cachedGrants = rows;
  }

  function movedRows(): FundingSubmissionListGrantDto[] {
    return [grant(100, 2), grant(200, 3), grant(300, 1)];
  }

  beforeEach(async () => {
    detailFixtures = [];
    storage = new MemoryStorage();
    funding = jasmine.createSpyObj('FundingSubmissionsService', [
      'getJustification', 'getDocPriorityOptions', 'getDocPayDefaults', 'getListDetail',
      'getListStatusHistory', 'bulkUpdateListGrants', 'removeGrantsFromList', 'getBudgetCategoryOptions'
    ]);
    funding.getBudgetCategoryOptions.and.returnValue(of([{ code: 'R01R37', name: 'R01/R37' }]));
    funding.getJustification.and.returnValue(of({ justificationText: '' }));
    funding.getDocPriorityOptions.and.returnValue(of([1, 2, 3, 4, 5]));
    funding.getListDetail.and.callFake(() => of(listDetail()));
    funding.getListStatusHistory.and.returnValue(of([]));
    funding.bulkUpdateListGrants.and.returnValue(of(1));
    const dropdowns = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
      'getDocDecisions', 'getAnnualFundingR01Options', 'getAnnualOrMyfOptions',
      'getBudgetCategories', 'getDocNciSelections'
    ]);
    dropdowns.getDocDecisions.and.returnValue(of([
      { id: 'Pay', text: 'Pay' }, { id: 'Do Not Pay', text: 'Do Not Pay' }
    ]));
    dropdowns.getAnnualFundingR01Options.and.returnValue(of([]));
    dropdowns.getAnnualOrMyfOptions.and.returnValue(of([]));
    dropdowns.getBudgetCategories.and.returnValue(of([]));
    dropdowns.getDocNciSelections.and.returnValue(of([]));
    const user = jasmine.createSpyObj('AppUserSessionService', [
      'hasRole', 'getDocFundingSubmissionCoordinatorDocAbbrevs'
    ]);
    user.hasRole.and.callFake(role => role === roleNames.DOC_FUNDING_LIST_COR);
    user.getDocFundingSubmissionCoordinatorDocAbbrevs.and.returnValue(['DCB']);
    const properties = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    properties.getProperty.and.returnValue('http://example/');

    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NgSelect2Module, NgbTooltipModule],
      declarations: [SearchListsComponent, GrantDetailComponent, UserSelect2ChangeDirective],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FundingSubmissionsService, useValue: funding },
        { provide: FundingSubmDropdownLookupService, useValue: dropdowns },
        { provide: AppUserSessionService, useValue: user },
        { provide: AppPropertiesService, useValue: properties },
        { provide: LoaderService, useValue: jasmine.createSpyObj('LoaderService', ['show', 'hide']) },
        { provide: DocumentService, useValue: jasmine.createSpyObj('DocumentService', ['downloadById']) },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['post']) },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: FUNDING_WRITE_RECOVERY_STORAGE, useValue: storage }
      ]
    }).compileComponents();

    pageFixture = TestBed.createComponent(SearchListsComponent);
    page = pageFixture.componentInstance;
    page.listId = 42;
    page.dtOptions.columns = [
      { data: 'applId' }, { data: 'doc' }, { data: 'grantNumber' }, { data: 'docPriority' }
    ];
    currentOrder = [[2, 'desc']];
    order = jasmine.createSpy('order').and.callFake(value => { currentOrder = value; });
    const rowsApi = {
      every: (callback: (this: { data: () => FundingSubmissionListGrantDto }) => void) => {
        ((page as any).cachedGrants as FundingSubmissionListGrantDto[])
          .forEach(row => callback.call({ data: () => row }));
      },
      invalidate: () => rowsApi,
      draw: jasmine.createSpy('draw')
    };
    page.dtElement = {
      dtInstance: Promise.resolve({ order, rows: () => rowsApi, ajax: { reload: jasmine.createSpy('reload') } })
    } as any;
  });

  afterEach(() => {
    pageFixture.destroy();
    detailFixtures.forEach(fixture => fixture.destroy());
  });

  it('rebases an untouched open priority and baseline while preserving notes and the later full-overwrite save', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    const response = new Subject<FundingSubmissionListDetailDto>();
    funding.getListDetail.and.returnValue(response);
    peer.formModel.docNotes = 'Unsaved notes';
    peer.onNotesModelChange('docNotes');
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();
    peer.onSave();
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    expect(peer.prioritySaveBlocked).toBeTrue();
    const saveButton = Array.from(detailFixtures[0].nativeElement.querySelectorAll('button'))
      .find((button: HTMLButtonElement) => button.textContent.trim() === 'Save') as HTMLButtonElement;
    expect(saveButton.disabled).toBeTrue();

    serverGrants = movedRows();
    response.next(listDetail());
    flushMicrotasks();

    expect(peer.data.docPriority).toBe(3);
    expect(peer.formModel.docPriority).toBe('3');
    expect(peer.formModel.docNotes).toBe('Unsaved notes');
    expect(JSON.parse((peer as any).initialFundingSnapshot).docPriority).toBe('3');
    expect(JSON.parse((peer as any).initialFormSnapshot).docPriority).toBe('3');
    expect(peer.hasUnsavedChanges()).toBeTrue();
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);

    serverGrants[1].docNotes = 'Unsaved notes';
    funding.getListDetail.and.returnValue(of(listDetail()));
    peer.onSave();
    const secondRequest = funding.bulkUpdateListGrants.calls.mostRecent().args[0];
    expect(secondRequest.fields.docPriority).toBe('3');
    expect(secondRequest.fields.docNotes).toBe('Unsaved notes');
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
    flushMicrotasks();
  }));

  for (const timing of ['before', 'during']) {
    it(`preserves a genuine priority edit made ${timing} another grant's delayed readback`, fakeAsync(() => {
      const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
      seedRows(rows);
      const peer = openEditor(rows[1]);
      const mover = openEditor(rows[2]);
      const response = new Subject<FundingSubmissionListDetailDto>();
      funding.getListDetail.and.returnValue(response);
      if (timing === 'before') peer.onUserSelectChange('docPriority', '1');
      mover.onUserSelectChange('docPriority', '1');
      mover.onSave();
      if (timing === 'during') peer.onUserSelectChange('docPriority', '1');

      serverGrants = movedRows();
      response.next(listDetail());
      flushMicrotasks();

      expect(peer.data.docPriority).toBe(3);
      expect(peer.formModel.docPriority).toBe('1');
      expect(JSON.parse((peer as any).initialFundingSnapshot).docPriority).toBe('3');
      expect(peer.hasUnsavedChanges()).toBeTrue();
    }));
  }

  it('re-sorts a downward move using the configured DOC and priority column positions', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    page.dtOptions.columns = [{ data: 'doc' }, { data: 'grantNumber' }, { data: 'docPriority' }];
    const mover = openEditor(rows[0]);
    serverGrants = [grant(100, 3), grant(200, 1), grant(300, 2)];
    mover.onUserSelectChange('docPriority', '3');

    mover.onSave();
    flushMicrotasks();

    expect(currentOrder).toEqual([[0, 'asc'], [2, 'asc']]);
    expect(order).toHaveBeenCalledTimes(1);
  }));

  it('does not redraw a destroyed page when the DataTables instance resolves late', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    let resolveTable: (dt: any) => void;
    page.dtElement = { dtInstance: new Promise(resolve => { resolveTable = resolve; }) } as any;
    const mover = openEditor(rows[1]);
    serverGrants = [grant(100, 2), grant(200, 1)];
    mover.onUserSelectChange('docPriority', '1');
    mover.onSave();

    page.ngOnDestroy();
    resolveTable({ order, rows: jasmine.createSpy('rows') });
    flushMicrotasks();

    expect(order).not.toHaveBeenCalled();
  }));

  for (const previewState of ['in flight', 'already applied']) {
    it(`refreshes an ${previewState} AUTO preview after another grant is resequenced`, () => {
      const rows = [
        grant(100, 1), grant(200, null, { docDecision: 'Do Not Pay' }), grant(300, 3), grant(400, 2)
      ];
      seedRows(rows);
      const peer = openEditor(rows[1]);
      const mover = openEditor(rows[2]);
      const oldDefaults = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
      const newDefaults = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
      const defaults: FundingSubmissionDocPayDefaultsDto = {
        applId: 200, transitionEligible: true, budgetCategories: 'R01', docNciSelection: 'DOC',
        annualOrMyf: 'MYF', docPriority: '4', docRecAmt: 90000, docRecReductionPct: 10
      };
      funding.getDocPayDefaults.and.returnValues(oldDefaults, newDefaults);
      peer.onUserSelectChange('docDecision', 'Pay');
      if (previewState === 'already applied') oldDefaults.next([defaults]);
      expect(peer.docPayDefaultsLoading).toBe(previewState === 'in flight');
      serverGrants = [
        grant(100, 2), grant(200, null, { docDecision: 'Do Not Pay' }), grant(300, 1), grant(400, 3)
      ];
      mover.onUserSelectChange('docPriority', '1');

      mover.onSave();
      expect(funding.getDocPayDefaults).toHaveBeenCalledTimes(2);
      oldDefaults.next([{ ...defaults, docPriority: '5' }]);
      expect(peer.formModel.docPriority).toBeNull();
      newDefaults.next([defaults]);

      expect(peer.formModel.docPriority).toBe('4');
      expect((peer as any).provenance.intent(200).priorityMode).toBe('AUTO');
      expect(peer.docPayDefaultsLoading).toBeFalse();
    });
  }

  it('does not disturb an AUTO preview when another grant only saves notes', () => {
    const rows = [grant(100, 1), grant(200, null, { docDecision: 'Do Not Pay' })];
    seedRows(rows);
    const peer = openEditor(rows[1]);
    const notesEditor = openEditor(rows[0]);
    const defaults = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
    funding.getDocPayDefaults.and.returnValue(defaults);
    peer.onUserSelectChange('docDecision', 'Pay');
    defaults.next([{
      applId: 200, transitionEligible: true, budgetCategories: 'R01', docNciSelection: 'DOC',
      annualOrMyf: 'MYF', docPriority: '2', docRecAmt: 90000, docRecReductionPct: 10
    }]);
    notesEditor.formModel.docNotes = 'Updated notes';
    serverGrants[0].docNotes = 'Updated notes';

    notesEditor.onSave();

    expect(funding.getDocPayDefaults).toHaveBeenCalledTimes(1);
    expect(peer.formModel.docPriority).toBe('2');
    expect((peer as any).provenance.intent(200).priorityMode).toBe('AUTO');
  });

  it('blocks peers through a failed acknowledged readback and retries only GET', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    const write = new Subject<number>();
    funding.bulkUpdateListGrants.and.returnValue(write);
    funding.getListDetail.and.returnValue(throwError(() => new Error('Read unavailable')));
    peer.formModel.docNotes = 'Peer notes';
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();
    peer.onSave();
    expect(peer.prioritySaveBlocked).toBeTrue();
    write.next(1);
    expect(mover.fundingRefreshError).toContain('Grant changes were saved');
    expect(peer.prioritySaveBlocked).toBeTrue();
    peer.onSave();
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    expect(currentOrder).toEqual([[2, 'desc']]);

    serverGrants = movedRows();
    funding.getListDetail.and.returnValue(of(listDetail()));
    mover.refreshSavedFunding();
    flushMicrotasks();
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    expect(funding.getListDetail).toHaveBeenCalledTimes(2);
    expect(peer.formModel.docPriority).toBe('3');
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);
  }));

  it('does not unblock peers when an authoritative readback omits an open grant', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    funding.getListDetail.and.returnValue(of({ grants: [grant(300, 1)] }));
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();

    expect(mover.fundingRefreshError).toContain('could not be refreshed');
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(peer.formModel.docPriority).toBe('2');
    serverGrants = movedRows();
    funding.getListDetail.and.returnValue(of(listDetail()));
    mover.refreshSavedFunding();
    expect(peer.formModel.docPriority).toBe('3');
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
  });

  it('does not unblock peers when the readback omits a displayed grant that is not open', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    funding.getListDetail.and.returnValue(of({ grants: [grant(200, 3), grant(300, 1)] }));
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();

    expect(mover.fundingRefreshError).toContain('could not be refreshed');
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(peer.formModel.docPriority).toBe('2');
    serverGrants = movedRows();
    funding.getListDetail.and.returnValue(of(listDetail()));
    mover.refreshSavedFunding();
    expect(peer.formModel.docPriority).toBe('3');
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
  });

  it('retains an unknown outcome across collapse and requires support confirmation before GET', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    funding.bulkUpdateListGrants.and.returnValue(throwError(() => ({ status: 500 })));
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();
    expect(mover.fundingRecoveryState).toBe('unknown');
    expect(peer.prioritySaveBlocked).toBeTrue();
    mover.forceDiscardAndClose();
    mover.onEdit();
    mover.recoverUnknownFunding();
    expect(funding.getListDetail).not.toHaveBeenCalled();

    serverGrants = movedRows();
    mover.unknownOutcomeConfirmed = true;
    mover.recoverUnknownFunding();
    expect(funding.getListDetail).toHaveBeenCalledTimes(1);
    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    expect(peer.formModel.docPriority).toBe('3');
    expect(peer.prioritySaveBlocked).toBeFalse();
  });

  it('restores a pending write from storage before another open grant can save', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    TestBed.inject(FundingWriteRecoveryService).begin(42, 300);
    page.loadPendingFundingRecoveries();
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    peer.formModel.docNotes = 'Peer notes';

    peer.onSave();
    expect(page.pendingFundingGrantLabels).toEqual(['GRANT-300']);
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(mover.fundingRecoveryState).toBe('unknown');
    expect(funding.bulkUpdateListGrants).not.toHaveBeenCalled();
    mover.unknownOutcomeConfirmed = true;
    mover.recoverUnknownFunding();
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(page.pendingFundingGrantLabels).toEqual([]);
  });

  it('does not rebase another unresolved recovery until that write is confirmed and read back', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const recovery = TestBed.inject(FundingWriteRecoveryService);
    recovery.begin(42, 300);
    recovery.mark(42, 300, 'saved');
    recovery.begin(42, 200);
    page.loadPendingFundingRecoveries();
    const peer = openEditor(rows[1]);
    const mover = openEditor(rows[2]);
    serverGrants = movedRows();

    mover.refreshSavedFunding();
    expect(peer.formModel.docPriority).toBe('2');
    expect(peer.fundingRecoveryState).toBe('unknown');
    expect(mover.prioritySaveBlocked).toBeTrue();
    peer.recoverUnknownFunding();
    expect(funding.getListDetail).toHaveBeenCalledTimes(1);

    peer.unknownOutcomeConfirmed = true;
    peer.recoverUnknownFunding();
    expect(peer.formModel.docPriority).toBe('3');
    expect(mover.prioritySaveBlocked).toBeFalse();
    expect(funding.getListDetail).toHaveBeenCalledTimes(2);
  });

  it('blocks saves when the page cannot inspect recovery records and permits a retry', () => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    const recovery = TestBed.inject(FundingWriteRecoveryService);
    const inspect = spyOn(recovery, 'pendingApplIds').and.throwError('Storage unavailable');
    page.loadPendingFundingRecoveries();
    const peer = openEditor(rows[1]);
    peer.formModel.docNotes = 'Peer notes';

    peer.onSave();
    expect(page.fundingRecoveryError).toContain('Contact support');
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(funding.bulkUpdateListGrants).not.toHaveBeenCalled();
    inspect.and.returnValue([]);
    page.loadPendingFundingRecoveries();
    expect(page.fundingRecoveryError).toBe('');
    expect(peer.prioritySaveBlocked).toBeFalse();
  });

  it('fails closed for peers if recovery storage becomes unavailable while preparing a save', () => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    const peer = openEditor(rows[0]);
    const mover = openEditor(rows[1]);
    const recovery = TestBed.inject(FundingWriteRecoveryService);
    const begin = spyOn(recovery, 'begin').and.throwError('Storage unavailable');
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();
    expect(page.fundingRecoveryError).toContain('Contact support');
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(funding.bulkUpdateListGrants).not.toHaveBeenCalled();

    begin.and.callThrough();
    page.loadPendingFundingRecoveries();
    expect(peer.prioritySaveBlocked).toBeFalse();
  });

  it('releases the same-page gate after a definite rejected write', () => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    const peer = openEditor(rows[0]);
    const mover = openEditor(rows[1]);
    funding.bulkUpdateListGrants.and.returnValue(throwError(() => ({ status: 400 })));
    mover.onUserSelectChange('docPriority', '1');

    mover.onSave();

    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(mover.fundingRecoveryState).toBeNull();
    expect(funding.getListDetail).not.toHaveBeenCalled();
  });

  it('keeps the selected sort for a notes-only save and a no-op', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    const notes = openEditor(rows[0]);
    const unchanged = openEditor(rows[1]);
    notes.formModel.docNotes = 'Updated notes';
    serverGrants[0].docNotes = 'Updated notes';

    notes.onSave();
    unchanged.onSave();
    flushMicrotasks();

    expect(funding.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    expect(order).not.toHaveBeenCalled();
    expect(currentOrder).toEqual([[2, 'desc']]);
  }));

  it('keeps the selected sort after the required Do Not Pay priority clear', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    const detail = openEditor(rows[1]);
    serverGrants[1] = grant(200, null, { docDecision: 'Do Not Pay', docNotes: 'Stored note' });
    detail.onUserSelectChange('docDecision', 'Do Not Pay');

    detail.onSave();
    flushMicrotasks();

    expect(funding.bulkUpdateListGrants.calls.mostRecent().args[0].fields.docPriority).toBeNull();
    expect(order).not.toHaveBeenCalled();
    expect(currentOrder).toEqual([[2, 'desc']]);
  }));

  it('keeps the selected sort for a blank-to-ranked AUTO transition', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, null, { docDecision: 'Do Not Pay' })];
    seedRows(rows);
    const defaults: FundingSubmissionDocPayDefaultsDto = {
      applId: 200, transitionEligible: true, budgetCategories: 'R01', docNciSelection: 'DOC',
      annualOrMyf: 'MYF', docPriority: '2', docRecAmt: 90000, docRecReductionPct: 10
    };
    funding.getDocPayDefaults.and.returnValue(of([defaults]));
    const detail = openEditor(rows[1]);
    serverGrants[1] = grant(200, 2, { budgetCategoryCode: 'R01', docNciSelection: 'DOC', annualOrMyf: 'MYF' });

    detail.onUserSelectChange('docDecision', 'Pay');
    detail.onSave();
    flushMicrotasks();

    expect(funding.bulkUpdateListGrants.calls.mostRecent().args[0].transitionIntents[0].priorityMode).toBe('AUTO');
    expect(order).not.toHaveBeenCalled();
    expect(currentOrder).toEqual([[2, 'desc']]);
  }));

  it('re-sorts after an actual removal, rebases a surviving edit, and refreshes priority options', fakeAsync(() => {
    const rows = [1, 2, 3, 4, 5].map(priority => grant(priority * 100, priority));
    seedRows(rows);
    const peer = openEditor(rows[2]);
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 1, removedGrantNumbers: ['GRANT-200'] }));
    serverGrants = [grant(100, 1), grant(300, 2), grant(400, 3), grant(500, 4)];
    funding.getDocPriorityOptions.and.returnValue(of([1, 2, 3, 4]));
    const readback = new Subject<FundingSubmissionListDetailDto>();
    funding.getListDetail.and.returnValue(readback);

    page.onConfirmRemove();
    peer.formModel.docNotes = 'New notes while removing';
    readback.next(listDetail());
    readback.complete();
    flushMicrotasks();

    expect(peer.formModel.docPriority).toBe('2');
    expect(peer.formModel.docNotes).toBe('New notes while removing');
    expect(JSON.parse((peer as any).initialFundingSnapshot).docPriority).toBe('2');
    expect(peer.hasUnsavedChanges()).toBeTrue();
    expect(peer.docPriorityOptions.map(option => option.id)).toEqual(['1', '2', '3', '4']);
    expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);
  }));

  it('keeps an in-flight AUTO preview usable when removal refreshes its grant', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, null, { docDecision: 'Do Not Pay' })];
    seedRows(rows);
    const peer = openEditor(rows[2]);
    const originalData = peer.data;
    const oldDefaults = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
    const newDefaults = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
    funding.getDocPayDefaults.and.returnValues(oldDefaults, newDefaults);
    peer.onUserSelectChange('docDecision', 'Pay');
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 1 }));
    serverGrants = [grant(100, 1), grant(300, null, { docDecision: 'Do Not Pay' })];

    page.onConfirmRemove();
    expect(peer.data).toBe(originalData);
    expect(funding.getDocPayDefaults).toHaveBeenCalledTimes(2);
    newDefaults.next([{
      applId: 300, transitionEligible: true, budgetCategories: 'R01', docNciSelection: 'DOC',
      annualOrMyf: 'MYF', docPriority: '2', docRecAmt: 90000, docRecReductionPct: 10
    }]);

    expect(peer.formModel.docPriority).toBe('2');
    expect(peer.docPayDefaultsLoading).toBeFalse();
    expect((peer as any).provenance.intent(300).priorityMode).toBe('AUTO');
  });

  it('keeps an expanded editor attached and usable after a real DataTables removal reload', fakeAsync(() => {
    const jquery = require('jquery');
    const pluginNames = ['dataTable', 'DataTable', 'dataTableSettings', 'dataTableExt'];
    const originalPlugins = pluginNames.map(name => Object.getOwnPropertyDescriptor(jquery.fn, name));
    const originalDollar = (window as any).$;
    const originalHandlers = new Set(
      (jquery._data(document, 'events')?.['plugin-init'] ?? []).map(entry => entry.handler)
    );
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>ID</th><th>DOC</th><th>Grant</th><th>Priority</th></tr></thead><tbody></tbody>';
    document.body.appendChild(table);
    let dt: DataTables.Api;
    try {
      installDataTables(jquery);
      (window as any).$ = jquery;
      const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
      seedRows(rows);
      dt = jquery(table).DataTable({
        ajax: (params, callback) => page.ajaxCall(page, params, callback),
        columns: page.dtOptions.columns,
        paging: false,
        searching: false,
        order: [[2, 'desc']]
      });
      page.dtElement = { dtInstance: Promise.resolve(dt) } as any;
      const peer = openEditor(rows[2]);
      const host: HTMLElement = (page as any).detailComponentsByApplId.get(300).location.nativeElement;
      const rowForPeer = () => dt.row((_index: number, data: FundingSubmissionListGrantDto) => data.applId === 300);
      rowForPeer().child(host).show();
      peer.saved.subscribe(() => (page as any).handleDetailSaved(rowForPeer()));
      peer.formModel.docNotes = 'Unsaved notes';
      peer.onNotesModelChange('docNotes');
      expect(document.body.contains(host)).toBeTrue();

      page.selectedRows.set(200, rows[1]);
      funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 1 }));
      serverGrants = [grant(100, 1), grant(300, 2)];
      page.onConfirmRemove();
      flushMicrotasks();

      expect(document.body.contains(host)).toBeTrue();
      expect(rowForPeer().child.isShown()).toBeTruthy();
      expect(peer.formModel.docPriority).toBe('2');
      expect(peer.formModel.docNotes).toBe('Unsaved notes');
      serverGrants[1].docNotes = 'Unsaved notes';
      peer.onSave();
      flushMicrotasks();
      expect(funding.bulkUpdateListGrants.calls.mostRecent().args[0].fields.docPriority).toBe('2');
      expect(document.body.contains(host)).toBeTrue();
    } finally {
      dt?.destroy();
      tick(500);
      table.remove();
      const handlers = jquery._data(document, 'events')?.['plugin-init'] ?? [];
      handlers.filter(entry => !originalHandlers.has(entry.handler))
        .forEach(entry => jquery(document).off('plugin-init.dt', entry.handler));
      pluginNames.forEach((name, index) => {
        if (originalPlugins[index]) {
          Object.defineProperty(jquery.fn, name, originalPlugins[index]);
        } else {
          delete jquery.fn[name];
        }
      });
      (window as any).$ = originalDollar;
    }
  }));

  it('keeps the selected sort for a blocked-only removal', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 0, blockedGrantNumbers: ['GRANT-200'] }));

    page.onConfirmRemove();
    flushMicrotasks();
    tick();

    expect(page.blockedGrantNumbers).toEqual(['GRANT-200']);
    expect(order).not.toHaveBeenCalled();
    expect(currentOrder).toEqual([[2, 'desc']]);
  }));

  it('keeps peers blocked after a removal readback failure and retries GET without removing twice', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[2]);
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 1 }));
    funding.getListDetail.and.returnValue(throwError(() => new Error('Read unavailable')));

    page.onConfirmRemove();
    expect(page.removalRefreshError).toContain('could not be reconciled');
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(order).not.toHaveBeenCalled();

    serverGrants = [grant(100, 1), grant(300, 2)];
    funding.getListDetail.and.returnValue(of(listDetail()));
    page.retryRemovalRefresh();
    flushMicrotasks();
    expect(funding.removeGrantsFromList).toHaveBeenCalledTimes(1);
    expect(funding.getListDetail).toHaveBeenCalledTimes(2);
    expect(peer.formModel.docPriority).toBe('2');
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);
  }));

  it('keeps the removal gate closed if readback still contains a reported removed grant', () => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[2]);
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 1 }));

    page.onConfirmRemove();

    expect(page.removalRefreshError).toContain('could not be reconciled');
    expect(peer.prioritySaveBlocked).toBeTrue();
    expect(peer.formModel.docPriority).toBe('3');
    serverGrants = [grant(100, 1), grant(300, 2)];
    page.retryRemovalRefresh();
    expect(peer.formModel.docPriority).toBe('2');
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(funding.removeGrantsFromList).toHaveBeenCalledTimes(1);
  });

  it('retains a blocked selected grant and rebases it when another selected grant is removed', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const blocked = openEditor(rows[2]);
    page.selectedRows.set(200, rows[1]);
    page.selectedRows.set(300, rows[2]);
    funding.removeGrantsFromList.and.returnValue(of({
      grantsRemoved: 1, removedGrantNumbers: ['GRANT-200'], blockedGrantNumbers: ['GRANT-300']
    }));
    serverGrants = [grant(100, 1), grant(300, 2)];

    page.onConfirmRemove();
    flushMicrotasks();
    tick();

    expect(page.blockedGrantNumbers).toEqual(['GRANT-300']);
    expect(blocked.formModel.docPriority).toBe('2');
    expect(blocked.hasUnsavedChanges()).toBeFalse();
    expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);
  }));

  it('rejects a removal readback that omits a reported blocked grant', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const blocked = openEditor(rows[2]);
    page.selectedRows.set(200, rows[1]);
    page.selectedRows.set(300, rows[2]);
    funding.removeGrantsFromList.and.returnValue(of({
      grantsRemoved: 1, removedGrantNumbers: ['GRANT-200'], blockedGrantNumbers: ['GRANT-300']
    }));
    serverGrants = [grant(100, 1)];

    page.onConfirmRemove();
    tick();

    expect(page.removalRefreshError).toContain('could not be reconciled');
    expect(blocked.isEditMode).toBeTrue();
    expect(blocked.formModel.docPriority).toBe('3');
    expect(blocked.prioritySaveBlocked).toBeTrue();
  }));

  it('also retains the removal gate when status history fails and retries the readback', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
    seedRows(rows);
    const peer = openEditor(rows[2]);
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(of({ grantsRemoved: 1 }));
    funding.getListStatusHistory.and.returnValue(throwError(() => new Error('History unavailable')));
    serverGrants = [grant(100, 1), grant(300, 2)];

    page.onConfirmRemove();
    expect(page.removalRefreshError).toContain('could not be reconciled');
    expect(peer.prioritySaveBlocked).toBeTrue();
    funding.getListStatusHistory.and.returnValue(of([]));
    page.retryRemovalRefresh();
    flushMicrotasks();
    expect(funding.removeGrantsFromList).toHaveBeenCalledTimes(1);
    expect(peer.formModel.docPriority).toBe('2');
    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);
  }));

  for (const response of ['error', 'empty', 'malformed']) {
    it(`requires support confirmation before reconciling an ${response} removal outcome`, fakeAsync(() => {
      const rows = [grant(100, 1), grant(200, 2), grant(300, 3)];
      seedRows(rows);
      const peer = openEditor(rows[2]);
      page.selectedRows.set(200, rows[1]);
      funding.removeGrantsFromList.and.returnValue(response === 'error'
        ? throwError(() => ({ status: 500 })) : response === 'empty' ? EMPTY : of({}));

      page.onConfirmRemove();
      page.retryRemovalRefresh();
      page.recoverUnknownRemoval();
      expect(page.removalOutcomeUnknown).toBeTrue();
      expect(peer.prioritySaveBlocked).toBeTrue();
      expect(funding.getListDetail).not.toHaveBeenCalled();

      serverGrants = [grant(100, 1), grant(300, 2)];
      page.unknownRemovalConfirmed = true;
      page.recoverUnknownRemoval();
      flushMicrotasks();
      expect(funding.removeGrantsFromList).toHaveBeenCalledTimes(1);
      expect(funding.getListDetail).toHaveBeenCalledTimes(1);
      expect(peer.formModel.docPriority).toBe('2');
      expect(peer.prioritySaveBlocked).toBeFalse();
      expect(currentOrder).toEqual([[1, 'asc'], [3, 'asc']]);
    }));
  }

  it('preserves sorting if a confirmed unknown removal did not actually remove a grant', fakeAsync(() => {
    const rows = [grant(100, 1), grant(200, 2)];
    seedRows(rows);
    const peer = openEditor(rows[0]);
    page.selectedRows.set(200, rows[1]);
    funding.removeGrantsFromList.and.returnValue(throwError(() => ({ status: 0 })));
    page.onConfirmRemove();
    page.unknownRemovalConfirmed = true;

    page.recoverUnknownRemoval();
    flushMicrotasks();

    expect(peer.prioritySaveBlocked).toBeFalse();
    expect(order).not.toHaveBeenCalled();
    expect(currentOrder).toEqual([[2, 'desc']]);
  }));
});
