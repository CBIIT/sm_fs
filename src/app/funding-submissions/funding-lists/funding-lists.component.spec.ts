import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Directive, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NgbAlertModule, NgbModal, NgbTooltip, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { of, Subject, throwError } from 'rxjs';
import { FundingListsComponent } from './funding-lists.component';
import { DirectorBulkEditComponent } from './bulk-edit/director-bulk-edit.component';
import { FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { DataTableDirective } from 'angular-datatables';

const NO_LOCKABLE_DECISIONS_TOOLTIP = 'There are no Approve or Reject decisions available to lock.';
const LOCK_SUCCESS_MESSAGE =
  'Success! All Approved and Rejected grants have been confirmed and their decisions can no longer be changed.';

// Loosely typed so legacy/blank decision values (e.g. 'Decline', '') can be exercised.
function buildGrant(overrides: { [field: string]: any } = {}): FundingSubmissionListGrantDto {
  return {
    applId: 1,
    grantNumber: 'R01CA000001',
    doc: 'DCB',
    docDecision: 'Pay',
    reviewStatusCode: 'DIRECTORREVIEW',
    nciDecision: 'Approve',
    lockedDate: undefined,
    ...overrides
  } as FundingSubmissionListGrantDto;
}

function emptyListDetail(): any {
  return { listCode: '', currentStatusDescrip: '', totalGrants: 0, totalDocRecAmt: 0, grants: [] };
}

@Directive({
  selector: 'ng-select2',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Select2TestValueAccessor),
    multi: true
  }]
})
class Select2TestValueAccessor implements ControlValueAccessor {
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

describe('FundingListsComponent', () => {
  let component: FundingListsComponent;
  let fixture: ComponentFixture<FundingListsComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsService>;
  let modalRefSpy: { close: jasmine.Spy; dismiss: jasmine.Spy };

  beforeEach(async () => {
    modalRefSpy = { close: jasmine.createSpy('close'), dismiss: jasmine.createSpy('dismiss') };
    fundingSubmissionsServiceSpy = jasmine.createSpyObj<FundingSubmissionsService>('FundingSubmissionsService', [
      'getListDetail',
      'saveNciDecisions',
      'confirmApprovalsAndRejections'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
      listCode: '',
      currentStatusDescrip: '',
      totalGrants: 0,
      totalDocRecAmt: 0,
      grants: []
    } as any));
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(of({} as any));

    const testingModule = TestBed.configureTestingModule({
      declarations: [FundingListsComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        },
        {
          provide: HttpClient,
          useValue: {}
        },
        {
          provide: AppPropertiesService,
          useValue: { getProperty: () => '' }
        },
        {
          provide: LoaderService,
          useValue: { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') }
        },
        {
          provide: NgbModal,
          useValue: { open: jasmine.createSpy('open').and.callFake(() => modalRefSpy) }
        },
        {
          provide: FundingSubmissionsService,
          useValue: fundingSubmissionsServiceSpy
        },
        {
          provide: NGXLogger,
          useValue: { error: jasmine.createSpy('error') }
        }
      ]
    });
    TestBed.overrideComponent(FundingListsComponent, { set: { template: '<ng-template #nciDecisionRenderer></ng-template>' } });
    await testingModule.compileComponents();

    fixture = TestBed.createComponent(FundingListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carries the selected tab, DOC, and row IDs through Bulk Decision and its Back button', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const historyState = spyOnProperty(history, 'state', 'get').and.returnValue({ navigationId: 6 });
    const replaceState = spyOn(history, 'replaceState');
    component.listId = 39;
    component.pageTitle = '11/06/2026';
    component.selectedTab = 'hold';
    component.selectedDoc = 'DCTD';
    component.grants = [buildGrant({ applId: 42, doc: 'DCTD', nciDecision: 'Hold' })];
    component.selectedRows.set(42, component.grants[0]);

    component.goToDirectorBulkEdit();

    expect(navigate).toHaveBeenCalledWith(['/funding-submissions/director-bulk-edit'], jasmine.objectContaining({
      state: jasmine.objectContaining({
        fundingListViewState: { listId: 39, selectedTab: 'hold', selectedDoc: 'DCTD', selectedApplIds: [42] }
      })
    }));
    const outboundState = navigate.calls.mostRecent().args[1].state;
    expect(replaceState).toHaveBeenCalledWith({
      navigationId: 6,
      fundingListViewState: outboundState.fundingListViewState
    }, document.title);

    historyState.and.returnValue(outboundState);
    const bulkComponent = new DirectorBulkEditComponent(
      TestBed.inject(ActivatedRoute), TestBed.inject(Router), TestBed.inject(AppPropertiesService),
      fundingSubmissionsServiceSpy, TestBed.inject(NGXLogger)
    );
    bulkComponent.listId = 39;
    bulkComponent.selectionDate = component.pageTitle;

    bulkComponent.onBackClick();

    expect(navigate).toHaveBeenCalledWith(['/funding-submissions/funding-lists'], {
      queryParams: { listId: 39, selectionDate: component.pageTitle },
      state: { fundingListViewState: outboundState.fundingListViewState }
    });
  });

  it('restores the returned tab, DOC, and selections using fresh API rows', () => {
    const historyState = spyOnProperty(history, 'state', 'get').and.returnValue({
      navigationId: 7,
      fundingListViewState: { listId: 39, selectedTab: 'hold', selectedDoc: 'DCTD', selectedApplIds: [42, 99] }
    });
    const replaceState = spyOn(history, 'replaceState').and.callFake(state => historyState.and.returnValue(state));
    component.listId = 39;
    const freshGrant = buildGrant({ applId: 42, doc: 'DCTD', nciDecision: 'Hold', nciDirectorNotes: 'Saved note' });
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
      ...emptyListDetail(),
      grants: [buildGrant({ applId: 1, doc: 'DCB', nciDecision: null }), freshGrant]
    }));

    (component as any).loadListMeta();

    expect(component.selectedTab).toBe('hold');
    expect(component.selectedDoc).toBe('DCTD');
    expect(Array.from(component.selectedRows.keys())).toEqual([42]);
    expect(component.selectedRows.get(42)).toBe(freshGrant);
    expect(replaceState).toHaveBeenCalledWith({ navigationId: 7 }, document.title);

    component.selectTab('all');
    expect((component as any).restoreFundingListViewState()).toBeFalse();
    expect(component.selectedTab).toBe('all');
    expect(component.selectedRows.size).toBe(0);
  });

  it('uses the default tab without a DOC for a different list instead of restoring stale selections', () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({
      fundingListViewState: { listId: 38, selectedTab: 'hold', selectedDoc: 'DCTD', selectedApplIds: [42] }
    });
    component.listId = 39;
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
      ...emptyListDetail(),
      grants: [buildGrant({ applId: 1, nciDecision: null }), buildGrant({ applId: 42, doc: 'DCTD', nciDecision: 'Hold' })]
    }));

    (component as any).loadListMeta();

    expect(component.selectedTab).toBe('pending');
    expect(component.selectedDoc).toBe('');
    expect(component.selectedRows.size).toBe(0);
  });

  it('does not reselect grants moved out of the restored tab after Bulk Decision saves', () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({
      fundingListViewState: { listId: 39, selectedTab: 'pending', selectedDoc: 'DCTD', selectedApplIds: [42] }
    });
    spyOn(history, 'replaceState');
    component.listId = 39;
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
      ...emptyListDetail(),
      grants: [buildGrant({ applId: 42, doc: 'DCTD', nciDecision: 'Approve' }), buildGrant({ applId: 43, doc: 'DCTD', nciDecision: null })]
    }));

    (component as any).loadListMeta();

    expect(component.selectedTab).toBe('pending');
    expect(component.selectedDoc).toBe('DCTD');
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([43]);
    expect(component.selectedRows.size).toBe(0);
  });

  it('retains an unavailable restored DOC without selecting grants hidden by that filter', () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({
      fundingListViewState: { listId: 39, selectedTab: 'hold', selectedDoc: 'DCTD', selectedApplIds: [42] }
    });
    spyOn(history, 'replaceState');
    component.listId = 39;
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
      ...emptyListDetail(),
      grants: [buildGrant({ applId: 1, nciDecision: 'Hold' }), buildGrant({ applId: 42, doc: 'DCTD', nciDecision: 'Approve' })]
    }));

    (component as any).loadListMeta();

    expect(component.selectedTab).toBe('hold');
    expect(component.selectedDoc).toBe('DCTD');
    expect(component.filteredGrants).toEqual([]);
    expect(component.selectedRows.size).toBe(0);
  });

  describe('FS-2408 grant-number filter', () => {
    let reloadTable: jasmine.Spy;

    beforeEach(() => {
      component.selectedTab = 'all';
      component.grants = [
        buildGrant({ applId: 1, grantNumber: ' R01CA000001 ', doc: 'DCB', nciDecision: null, docRecommendedAmount: 100 }),
        buildGrant({ applId: 2, grantNumber: 'U01CA000002', doc: 'DCTD', nciDecision: '', docRecommendedAmount: 200 }),
        buildGrant({ applId: 3, grantNumber: 'R01CA000003', doc: 'DCB', nciDecision: 'Approve', docRecommendedAmount: 300 }),
        buildGrant({ applId: 4, grantNumber: 'R01CA000004', doc: 'DCTD', nciDecision: 'Hold', docRecommendedAmount: 400 }),
        buildGrant({ applId: 5, grantNumber: 'R01CA000005', doc: 'DCB', reviewStatusCode: 'DRAFT' })
      ];
      reloadTable = spyOn<any>(component, 'reloadTable').and.stub();
    });

    it('starts on the default tab with all DOCs and does not default a DOC after tab changes', () => {
      spyOnProperty(history, 'state', 'get').and.returnValue({});
      component.listId = 39;
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
        ...emptyListDetail(),
        grants: component.grants
      }));

      (component as any).loadListMeta();

      expect(component.selectedTab).toBe('pending');
      expect(component.selectedDoc).toBe('');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
      component.selectTab('all');
      expect(component.selectedDoc).toBe('');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2, 3, 4]);
    });

    it('does not carry an applied search or selections to a different list on the same route', () => {
      const queryParams = new Subject<{ listId: number }>();
      (TestBed.inject(ActivatedRoute) as any).queryParams = queryParams.asObservable();
      spyOnProperty(history, 'state', 'get').and.returnValue({});
      component.ngOnInit();
      component.listId = 39;
      component.selectDoc('DCB');
      component.grantNumbers = 'R01CA000001';
      component.grantNumbersInteracted = true;
      component.searchGrantNumbers();
      component.selectedRows.set(1, component.grants[0]);
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
        ...emptyListDetail(),
        grants: [
          buildGrant({ applId: 6, doc: 'DCB', nciDecision: null }),
          buildGrant({ applId: 7, doc: 'DCTD', nciDecision: null })
        ]
      }));

      queryParams.next({ listId: 40 });

      expect(component.listId).toBe(40);
      expect(component.selectedTab).toBe('pending');
      expect(component.selectedDoc).toBe('');
      expect(component.grantNumbers).toBe('');
      expect(component.grantNumbersInteracted).toBeFalse();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([6, 7]);
      expect(component.selectedRows.size).toBe(0);
    });

    it('marks a DOC and shows its total without filtering, clearing selections, or reloading', () => {
      component.selectedRows.set(2, component.grants[1]);

      component.selectDoc('DCB');
      component.selectDoc('DCB');

      expect(component.selectedDoc).toBe('DCB');
      expect(component.showSelectedDocSummary).toBeTrue();
      expect(component.selectedDocSummary).toEqual({ doc: 'DCB', recommendedTotal: 400 });
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2, 3, 4]);
      expect(component.selectedRows.has(2)).toBeTrue();
      expect(reloadTable).not.toHaveBeenCalled();
    });

    it('validates zero, 1,000, and 1,001 entries before applying a search', () => {
      component.selectedRows.set(1, component.grants[0]);
      component.selectDoc('DCB');
      component.grantNumbers = ' , \n ';
      expect(component.grantNumberValidationMessage).toBe('At least one Grant Number is required.');
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2, 3, 4]);
      expect(component.selectedRows.has(1)).toBeTrue();
      expect(reloadTable).not.toHaveBeenCalled();

      component.grantNumbers = Array(1000).fill('R01CA000001').join(' ');
      expect(component.grantNumberValidationMessage).toBeNull();
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(1);

      component.selectedRows.set(1, component.grants[0]);
      component.grantNumbers += ', R01CA000001';
      expect(component.grantNumberValidationMessage).toBe('Do not exceed 1,000 Grant Numbers.');
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.selectedRows.has(1)).toBeTrue();
      expect(reloadTable).toHaveBeenCalledTimes(1);
    });

    it('matches exact grant numbers case-insensitively after trimming within the selected tab', () => {
      component.selectedTab = 'pending';
      component.grantNumbers = 'r01ca000001, u01Ca000002\nR01CA000003 R01CA00000';
      component.selectedRows.set(4, component.grants[3]);

      component.searchGrantNumbers();

      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(1);

      component.grantNumbers = 'R01CA00000';
      component.searchGrantNumbers();
      expect(component.filteredGrants).toEqual([]);
    });

    it('applies the selected DOC only on Search and leaves counts and totals unchanged', () => {
      component.grantNumbers = 'R01CA000001,U01CA000002,R01CA000003';
      component.selectDoc('DCB');
      component.searchGrantNumbers();

      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 3]);
      expect(component.getTabCount('all')).toBe(4);
      expect(component.getDocCount('DCTD')).toBe(2);
      component.selectedRows.set(1, component.grants[0]);
      component.selectDoc('DCTD');
      expect(component.selectedDocSummary).toEqual({ doc: 'DCTD', recommendedTotal: 600 });
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 3]);
      expect(component.selectedRows.has(1)).toBeTrue();
      expect(reloadTable).toHaveBeenCalledTimes(1);

      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([2]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(2);
    });

    it('keeps the applied search across tabs, including when its DOC is unavailable', () => {
      component.grantNumbers = 'R01CA000001 R01CA000003 R01CA000004';
      component.selectDoc('DCB');
      component.searchGrantNumbers();
      component.selectedRows.set(1, component.grants[0]);

      component.selectTab('approved');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([3]);
      expect(component.selectedRows.size).toBe(0);
      component.selectTab('hold');
      expect(component.availableDocs).toEqual(['DCTD']);
      expect(component.selectedDoc).toBe('DCB');
      expect(component.filteredGrants).toEqual([]);
      component.selectTab('all');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 3]);
    });

    it('retains a grant-only search across tabs without applying a later unsearched DOC', () => {
      component.grantNumbers = 'R01CA000001 U01CA000002 R01CA000003';
      component.searchGrantNumbers();
      component.selectDoc('DCTD');

      component.selectTab('pending');

      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
      expect(component.selectedDoc).toBe('');
      component.selectTab('approved');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([3]);
    });

    it('keeps the existing Bulk Decision state shape without persisting an applied grant search', () => {
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      const historyState = spyOnProperty(history, 'state', 'get').and.returnValue({ navigationId: 7 });
      spyOn(history, 'replaceState').and.callFake(state => historyState.and.returnValue(state));
      component.listId = 39;
      component.selectDoc('DCB');
      component.grantNumbers = 'R01CA000001';
      component.searchGrantNumbers();
      component.selectedRows.set(1, component.grants[0]);

      component.goToDirectorBulkEdit();

      expect(navigate.calls.mostRecent().args[1].state.fundingListViewState).toEqual({
        listId: 39, selectedTab: 'all', selectedDoc: 'DCB', selectedApplIds: [1]
      });
      expect((component as any).restoreFundingListViewState()).toBeTrue();
      expect(component.grantNumbers).toBe('');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 3]);
      expect(Array.from(component.selectedRows.keys())).toEqual([1]);
    });

    it('resets the input, interaction, DOC, search and selections without changing the tab', () => {
      component.selectTab('pending');
      component.selectDoc('DCB');
      component.grantNumbers = 'R01CA000001';
      component.grantNumbersInteracted = true;
      component.searchGrantNumbers();
      component.selectedRows.set(1, component.grants[0]);
      reloadTable.calls.reset();

      component.resetGrantNumberSearch();

      expect(component.selectedTab).toBe('pending');
      expect(component.grantNumbers).toBe('');
      expect(component.grantNumbersInteracted).toBeFalse();
      expect(component.showGrantNumberValidation).toBeFalse();
      expect(component.selectedDoc).toBe('');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps restored selections on redraw but clears them when table ordering changes', () => {
    const originalJquery = (window as any).$;
    const handlers: { [event: string]: () => void } = {};
    const tableNode = {
      off: jasmine.createSpy('off').and.callFake(() => tableNode),
      on: jasmine.createSpy('on').and.callFake((event, handler) => {
        handlers[event] = handler;
        return tableNode;
      })
    };
    const container = { off: () => container, on: () => container };
    const dt = {
      table: () => ({ container: () => container, node: () => tableNode }),
      order: jasmine.createSpy('order').and.returnValue([[1, 'asc'], [13, 'asc']])
    };
    spyOn<any>(component, 'stampCheckboxApplIds');
    spyOn<any>(component, 'syncHeaderSelectionState');
    const clear = spyOn<any>(component, 'clearSelectedRows');
    component.selectedRows.set(42, buildGrant({ applId: 42 }));
    (window as any).$ = target => target;
    try {
      (component as any).bindSelectionEvents(dt);
      handlers['order.dt.fundingClearSelections']();
      expect(clear).not.toHaveBeenCalled();
      expect(component.selectedRows.has(42)).toBeTrue();

      dt.order.and.returnValue([[1, 'desc']]);
      handlers['order.dt.fundingClearSelections']();
      expect(clear).toHaveBeenCalledWith(container);
    } finally {
      (window as any).$ = originalJquery;
    }
  });

  it('uses the NCI Decision template and formats search and export values while preserving raw sorting', () => {
    const column = component.dtOptions.columns.find((candidate: any) => candidate.title === 'NCI Decision');
    const grant = buildGrant({
      nciDecision: 'Hold',
      nciDecisionByName: 'Example, Alex',
      nciDecisionDate: new Date(2026, 9, 29)
    });

    expect(component.nciDecisionRenderer).toBeDefined();
    expect(column.ngTemplateRef.ref).toBe(component.nciDecisionRenderer);
    expect(column.render(grant.nciDecision, 'display', grant)).toBe('');
    expect(column.render(grant.nciDecision, 'filter', grant)).toBe('Hold by Example, Alex on 10/29/2026');
    expect(column.render(grant.nciDecision, 'export', grant)).toBe('Hold by Example, Alex on 10/29/2026');
    expect(column.render(grant.nciDecision, 'sort', grant)).toBe('Hold');
    expect(column.render(grant.nciDecision, 'type', grant)).toBe('Hold');
  });

  it('formats locked NCI Decision metadata and leaves missing decisions blank', () => {
    const column = component.dtOptions.columns.find((candidate: any) => candidate.title === 'NCI Decision');
    const grant = buildGrant({ lockedBy: 'Example, Jordan', lockedDate: new Date(2026, 9, 30) });

    expect(column.render(grant.nciDecision, 'export', grant))
      .toBe('Approve and locked by Example, Jordan on 10/30/2026');
    expect(column.render(null, 'filter', buildGrant({ nciDecision: null }))).toBe('');
  });

  it('exports the 16 visible data columns in table order without checkbox or Action', () => {
    const columns = component.dtOptions.columns;
    const exportIndexes = component.dtOptions.buttons[0].exportOptions.columns;

    expect(exportIndexes.map((index: number) => columns[index].title)).toEqual([
      'DOC',
      'PI',
      'Grant Number',
      'Institution',
      'Project Title',
      'Abs',
      'SS',
      'Justification',
      'Review status',
      'ESI',
      'NCI Decision',
      'DOC Decision',
      'DOC Priority',
      'DOC/NCI Sel',
      'Annual or MYF',
      'Recused'
    ]);
    expect(exportIndexes.map((index: number) => columns[index].title)).not.toContain('');
    expect(exportIndexes.map((index: number) => columns[index].title)).not.toContain('Action');
  });

  it('uses the export orthogonal value for Review status', () => {
    const reviewStatus = component.dtOptions.columns.find((column: any) => column.title === 'Review status');
    const exportOptions = component.dtOptions.buttons[0].exportOptions;
    const render = reviewStatus.render;

    expect(exportOptions.orthogonal).toBe('export');
    expect(render('Pay', 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('Pay 01/02/2026');
    expect(render('Pay', 'export', { reviewStatusDate: null })).toBe('Pay');
    expect(render('Pay', 'export', { reviewStatusDate: undefined })).toBe('Pay');
    expect(render('Pay', 'export', { reviewStatusDate: '' })).toBe('Pay');
    expect(render('', 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('');
    expect(render(null, 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('');
    expect(render(undefined, 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('');
  });

  it('keeps the Review status display rendering unchanged', () => {
    const reviewStatus = component.dtOptions.columns.find((column: any) => column.title === 'Review status');
    const render = reviewStatus.render;
    const withDate = render('Pay', 'display', { reviewStatusDate: new Date(2026, 0, 2) });
    const withoutDate = render('Pay', 'display', { reviewStatusDate: null });

    expect(withDate).toBe('<div>Pay</div><div class="text-muted">01/02/2026</div>');
    expect((withDate.match(/<div\b/g) || []).length).toBe(2);
    expect(withoutDate).toBe('<div>Pay</div>');
    expect((withoutDate.match(/<div\b/g) || []).length).toBe(1);
  });

  it('enables Export when rows exist and disables it when the table is empty', async () => {
    const button = {
      enable: jasmine.createSpy('enable'),
      disable: jasmine.createSpy('disable')
    };
    const tableApi = {
      columns: { adjust: jasmine.createSpy('adjust') },
      rows: jasmine.createSpy('rows').and.returnValue({ count: () => 1 }),
      button: jasmine.createSpy('button').and.returnValue(button)
    };
    spyOn<any>(component, 'syncExpandedDetailWidths').and.stub();
    spyOn<any>(component, 'bindHorizontalDragScroll').and.stub();
    spyOn<any>(component, 'bindSelectionEvents').and.stub();
    spyOn<any>(component, 'bindActionEvents').and.stub();
    spyOn<any>(component, 'bindDocLinkEvents').and.stub();
    component.dtElement = { dtInstance: Promise.resolve(tableApi) } as unknown as DataTableDirective;

    component.dtOptions.drawCallback();
    await Promise.resolve();

    expect(tableApi.button).toHaveBeenCalledWith('.btn-export-all');
    expect(tableApi.rows).toHaveBeenCalledWith({ search: 'applied' });
    expect(button.enable).toHaveBeenCalled();
    expect(button.disable).not.toHaveBeenCalled();

    tableApi.rows.and.returnValue({ count: () => 0 });
    component.dtOptions.drawCallback();
    await Promise.resolve();

    expect(button.disable).toHaveBeenCalled();
  });

  it('formats a date-only review status value using its calendar date', () => {
    const reviewStatus = component.dtOptions.columns.find((column: any) => column.title === 'Review status');

    expect(reviewStatus.render('Pay', 'export', { reviewStatusDate: '2026-01-02' })).toBe('Pay 01/02/2026');
  });

  it('scrolls to top after a successful individual Process decision save so success feedback is visible', () => {
    const scrollSpy = spyOn(window, 'scrollTo');
    spyOn<any>(component, 'reloadTable').and.stub();

    (component as any).pendingDecision = 'Approve';
    (component as any).pendingDecisionGrant = { applId: 42, grantNumber: 'R01CA123456' } as any;
    (component as any).pendingDecisionGrantNumber = 'R01CA123456';
    component.pendingDecisionNote = '';

    component.onConfirmGrantDecision();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();
    const scrollArg = scrollSpy.calls.mostRecent().args[0] as ScrollToOptions;
    expect(scrollArg.top).toBe(0);
    expect(scrollArg.behavior).toBe('smooth');
    expect(component.decisionSuccessMessage).toContain('Success! Grant R01CA123456 has been approved.');
  });

  it('does not call save or scroll when Hold is submitted without required note', () => {
    const scrollSpy = spyOn(window, 'scrollTo');

    (component as any).pendingDecision = 'Hold';
    (component as any).pendingDecisionGrant = { applId: 99, grantNumber: 'R21CA000999' } as any;
    (component as any).pendingDecisionGrantNumber = 'R21CA000999';
    component.pendingDecisionNote = '   ';

    component.onConfirmGrantDecision();

    expect(component.pendingDecisionValidationMessage).toBe('NCI Director Note is required.');
    expect(fundingSubmissionsServiceSpy.saveNciDecisions).not.toHaveBeenCalled();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  describe('FS-2343 decision lock (logic)', () => {
    const renderAction = (row: FundingSubmissionListGrantDto): string => {
      const actionColumn = component.dtOptions.columns.find((column: any) => column.title === 'Action');
      return actionColumn.render(null, 'display', row);
    };

    it('renders Locked with no Process options for a row with lockedDate', () => {
      const html = renderAction(buildGrant({ applId: 11, lockedDate: new Date(2026, 9, 13), lockedBy: 'DIRECTOR' }));

      expect(html).toContain('Locked');
      expect(html).toContain('fa-lock');
      expect(html).not.toContain('process-option');
      expect(html).not.toContain('Process <i');
      expect((component as any).getProcessOptionsForGrant(buildGrant({ lockedDate: new Date() }))).toEqual([]);
    });

    it('renders Process with options for an unlocked row', () => {
      const html = renderAction(buildGrant({ applId: 12, nciDecision: '' }));

      expect(html).toContain('Process <i');
      expect(html).toContain('process-option');
      expect(html).not.toContain('Locked');
    });

    it('refuses a Process decision for a locked row, even when the table row object is stale', () => {
      const openModalSpy = spyOn<any>(component, 'openGrantDecisionModal').and.stub();
      component.grants = [buildGrant({ applId: 13, lockedDate: new Date() })];

      (component as any).onProcessDecisionSelect(13, 'Hold', undefined, undefined, buildGrant({ applId: 13 }));
      (component as any).onProcessDecisionSelect(13, 'Hold');

      expect(openModalSpy).not.toHaveBeenCalled();
    });

    it('hasLockableDecisions is true for an eligible row outside the selected tab and DOC filter', () => {
      component.grants = [
        buildGrant({ applId: 1, doc: 'DCB', nciDecision: '' }),
        buildGrant({ applId: 2, doc: 'DCTD', nciDecision: 'Rejected' })
      ];
      component.selectedTab = 'pending';
      component.selectedDoc = 'DCB';

      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.hasLockableDecisions).toBeTrue();
    });

    it('hasLockableDecisions is false when only Hold/undecided rows exist', () => {
      component.grants = [
        buildGrant({ applId: 1, nciDecision: 'Hold' }),
        buildGrant({ applId: 2, nciDecision: '' }),
        buildGrant({ applId: 3, nciDecision: null })
      ];

      expect(component.hasLockableDecisions).toBeFalse();
    });

    it('hasLockableDecisions is false when every eligible row is already locked', () => {
      component.grants = [
        buildGrant({ applId: 1, nciDecision: 'Approve', lockedDate: new Date() }),
        buildGrant({ applId: 2, nciDecision: 'Rejected', lockedDate: new Date() })
      ];

      expect(component.hasLockableDecisions).toBeFalse();
    });

    it('hasLockableDecisions is false for a row not in Director Review', () => {
      component.grants = [buildGrant({ reviewStatusCode: 'DOCREVIEW' })];

      expect(component.hasLockableDecisions).toBeFalse();
    });

    it('hasLockableDecisions is false for a row whose DOC decision is not Pay', () => {
      component.grants = [buildGrant({ docDecision: 'Do Not Pay' })];

      expect(component.hasLockableDecisions).toBeFalse();
    });

    it('hasLockableDecisions is true for a legacy Decline decision', () => {
      component.grants = [buildGrant({ nciDecision: 'Decline' })];

      expect(component.hasLockableDecisions).toBeTrue();
    });

    it('Cancel dismisses the modal without calling the lock API', () => {
      component.grants = [buildGrant()];

      component.onConfirmDecisionsClick();
      component.onCancelConfirmDecisions();

      expect(modalRefSpy.dismiss).toHaveBeenCalled();
      expect(fundingSubmissionsServiceSpy.confirmApprovalsAndRejections).not.toHaveBeenCalled();
    });

    it('does not open the modal when nothing is eligible to lock', () => {
      const modalService = TestBed.inject(NgbModal) as unknown as { open: jasmine.Spy };
      component.grants = [buildGrant({ nciDecision: 'Hold' })];

      component.onConfirmDecisionsClick();

      expect(modalService.open).not.toHaveBeenCalled();
    });

    it('Yes calls confirmApprovalsAndRejections once, shows the success copy and reloads list detail', () => {
      const response$ = new Subject<any>();
      fundingSubmissionsServiceSpy.confirmApprovalsAndRejections.and.returnValue(response$.asObservable() as any);
      fundingSubmissionsServiceSpy.getListDetail.calls.reset();
      component.listId = 7;
      component.grants = [buildGrant()];
      component.onConfirmDecisionsClick();

      component.onProceedConfirmDecisions();
      component.onProceedConfirmDecisions();

      expect(component.isLockingDecisions).toBeTrue();
      expect(component.isLockActionDisabled).toBeTrue();
      expect(fundingSubmissionsServiceSpy.confirmApprovalsAndRejections).toHaveBeenCalledTimes(1);
      expect(fundingSubmissionsServiceSpy.confirmApprovalsAndRejections).toHaveBeenCalledWith(7);

      response$.next({ listId: 7, lockedCount: 1 });
      response$.complete();

      expect(component.isLockingDecisions).toBeFalse();
      expect(modalRefSpy.close).toHaveBeenCalled();
      expect(component.decisionSuccessMessage).toBe(LOCK_SUCCESS_MESSAGE);
      expect(component.lockErrorMessage).toBe('');
      expect(fundingSubmissionsServiceSpy.getListDetail).toHaveBeenCalledOnceWith(7);
    });

    it('409 shows the lock error, changes no row locally and reloads list detail', () => {
      const logger = TestBed.inject(NGXLogger) as unknown as { error: jasmine.Spy };
      fundingSubmissionsServiceSpy.confirmApprovalsAndRejections.and.returnValue(throwError(() => ({ status: 409 })));
      fundingSubmissionsServiceSpy.getListDetail.calls.reset();
      component.listId = 7;
      const eligibleGrant = buildGrant();
      component.grants = [eligibleGrant];

      component.onProceedConfirmDecisions();

      expect(component.lockErrorMessage).toContain('There are no Approve or Reject decisions available to lock.');
      expect(component.decisionSuccessMessage).toBe('');
      expect(eligibleGrant.lockedDate).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
      expect(fundingSubmissionsServiceSpy.getListDetail).toHaveBeenCalledOnceWith(7);
      expect(component.isLockingDecisions).toBeFalse();
    });

    it('403 shows the not-authorized error without reloading', () => {
      fundingSubmissionsServiceSpy.confirmApprovalsAndRejections.and.returnValue(throwError(() => ({ status: 403 })));
      fundingSubmissionsServiceSpy.getListDetail.calls.reset();
      component.listId = 7;
      component.grants = [buildGrant()];

      component.onProceedConfirmDecisions();

      expect(component.lockErrorMessage).toBe('You are not authorized to lock NCI Director decisions.');
      expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
    });

    it('other errors show the generic lock failure', () => {
      fundingSubmissionsServiceSpy.confirmApprovalsAndRejections.and.returnValue(throwError(() => ({ status: 500 })));
      component.grants = [buildGrant()];

      component.onProceedConfirmDecisions();

      expect(component.lockErrorMessage).toBe('Unable to lock NCI Director decisions right now. Please try again.');
    });

    it('blocks Bulk Decision when a selected applId is locked in the refreshed grants', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
      component.grants = [buildGrant({ applId: 21 }), buildGrant({ applId: 22, lockedDate: new Date() })];
      component.selectedRows.set(21, buildGrant({ applId: 21 }));
      // Stale selection object captured before the lock; the refreshed grants are the authority.
      component.selectedRows.set(22, buildGrant({ applId: 22 }));

      expect(component.hasLockedGrantSelected).toBeTrue();
      component.goToDirectorBulkEdit();
      expect(navigateSpy).not.toHaveBeenCalled();

      component.selectedRows.delete(22);
      expect(component.hasLockedGrantSelected).toBeFalse();
    });
  });

  describe('Process dropdown row expansion', () => {
    it('expands the selected grant row when Process is opened, even if legacy expansion predicate would be false', () => {
      const rowData = { applId: 123 } as any;
      const rowApi = { data: () => rowData } as any;

      const tableEl = document.createElement('table');
      const tbodyEl = document.createElement('tbody');
      const trEl = document.createElement('tr');
      const tdEl = document.createElement('td');
      tdEl.innerHTML = `
        <div class="btn-group process-dropdown-wrap">
          <button type="button" class="btn process-toggle" data-appl-id="123">Process</button>
          <div class="dropdown-menu process-menu"></div>
        </div>
      `;
      trEl.appendChild(tdEl);
      tbodyEl.appendChild(trEl);
      tableEl.appendChild(tbodyEl);
      document.body.appendChild(tableEl);

      const dtMock = {
        table: () => ({ body: () => tbodyEl }),
        row: jasmine.createSpy('row').and.returnValue(rowApi)
      } as any;

      const shouldExpandSpy = spyOn<any>(component, 'shouldExpandDetailForProcessDropdown').and.returnValue(false);
      const ensureExpandedSpy = spyOn<any>(component, 'ensureGrantRowExpanded').and.stub();

      (component as any).bindActionEvents(dtMock);

      const processButton = tdEl.querySelector('.process-toggle') as HTMLButtonElement;
      processButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(dtMock.row).toHaveBeenCalled();
      expect(shouldExpandSpy).not.toHaveBeenCalled();
      expect(ensureExpandedSpy).toHaveBeenCalled();
      const args = ensureExpandedSpy.calls.mostRecent().args;
      expect(args[0]).toBe(123);
      expect(args[3]).toBe(rowData);

      tableEl.remove();
    });

    it('does not try to expand when process button applId is invalid', () => {
      const rowData = { applId: 321 } as any;
      const rowApi = { data: () => rowData } as any;

      const tableEl = document.createElement('table');
      const tbodyEl = document.createElement('tbody');
      const trEl = document.createElement('tr');
      const tdEl = document.createElement('td');
      tdEl.innerHTML = `
        <div class="btn-group process-dropdown-wrap">
          <button type="button" class="btn process-toggle" data-appl-id="NaN">Process</button>
          <div class="dropdown-menu process-menu"></div>
        </div>
      `;
      trEl.appendChild(tdEl);
      tbodyEl.appendChild(trEl);
      tableEl.appendChild(tbodyEl);
      document.body.appendChild(tableEl);

      const dtMock = {
        table: () => ({ body: () => tbodyEl }),
        row: jasmine.createSpy('row').and.returnValue(rowApi)
      } as any;

      const ensureExpandedSpy = spyOn<any>(component, 'ensureGrantRowExpanded').and.stub();

      (component as any).bindActionEvents(dtMock);

      const processButton = tdEl.querySelector('.process-toggle') as HTMLButtonElement;
      processButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(ensureExpandedSpy).not.toHaveBeenCalled();

      tableEl.remove();
    });
  });
});

describe('FundingListsComponent FS-2343 decision lock (rendered template)', () => {
  let component: FundingListsComponent;
  let fixture: ComponentFixture<FundingListsComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsService>;

  beforeEach(async () => {
    fundingSubmissionsServiceSpy = jasmine.createSpyObj<FundingSubmissionsService>('FundingSubmissionsService', [
      'getListDetail',
      'saveNciDecisions',
      'confirmApprovalsAndRejections'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of(emptyListDetail()));

    await TestBed.configureTestingModule({
      declarations: [FundingListsComponent],
      imports: [RouterTestingModule, NgbTooltipModule, NgbAlertModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: HttpClient, useValue: {} },
        { provide: AppPropertiesService, useValue: { getProperty: () => '' } },
        { provide: LoaderService, useValue: { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') } },
        { provide: NgbModal, useValue: { open: jasmine.createSpy('open') } },
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: NGXLogger, useValue: { error: jasmine.createSpy('error') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FundingListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const lockButton = (): HTMLButtonElement =>
    fixture.debugElement.query(By.css('.confirm-btn')).nativeElement as HTMLButtonElement;
  const lockTooltip = (): NgbTooltip =>
    fixture.debugElement.query(By.css('.confirm-btn')).parent.injector.get(NgbTooltip);
  const bulkDecisionButton = (): HTMLButtonElement =>
    (fixture.debugElement.queryAll(By.css('button')).map(el => el.nativeElement as HTMLButtonElement)
      .find(button => (button.textContent || '').includes('Bulk Decision'))) as HTMLButtonElement;

  it('disables the Lock button with the no-eligible-decisions tooltip when nothing is eligible', () => {
    component.grants = [buildGrant({ nciDecision: 'Hold' }), buildGrant({ applId: 2, nciDecision: '' })];
    fixture.detectChanges();

    expect(lockButton().textContent).toContain('Lock Approvals and Rejections');
    expect(lockButton().disabled).toBeTrue();
    expect(lockTooltip().ngbTooltip).toBe(NO_LOCKABLE_DECISIONS_TOOLTIP);
    expect(lockTooltip().disableTooltip).toBeFalse();
  });

  it('enables the Lock button without the tooltip when an eligible decision exists', () => {
    component.grants = [buildGrant()];
    fixture.detectChanges();

    expect(lockButton().disabled).toBeFalse();
    expect(lockTooltip().disableTooltip).toBeTrue();
  });

  it('shows a dismissible danger alert when the lock request returns 409', () => {
    fundingSubmissionsServiceSpy.confirmApprovalsAndRejections.and.returnValue(throwError(() => ({ status: 409 })));
    component.listId = 7;
    component.grants = [buildGrant()];

    component.onProceedConfirmDecisions();
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('ngb-alert.alert-danger'));
    expect(alert).withContext('danger alert rendered').not.toBeNull();
    expect(alert.nativeElement.textContent).toContain('There are no Approve or Reject decisions available to lock.');
    expect(alert.query(By.css('.btn-close'))).withContext('dismissible').not.toBeNull();
  });

  it('disables Bulk Decision when a locked row is selected', () => {
    component.grants = [buildGrant({ applId: 31 }), buildGrant({ applId: 32, lockedDate: new Date() })];
    component.selectedRows.set(31, component.grants[0]);
    fixture.detectChanges();
    expect(bulkDecisionButton().disabled).toBeFalse();

    component.selectedRows.set(32, buildGrant({ applId: 32 }));
    fixture.detectChanges();
    expect(bulkDecisionButton().disabled).toBeTrue();
  });
});

describe('FundingListsComponent FS-2408 grant-number filter (rendered template)', () => {
  let component: FundingListsComponent;
  let fixture: ComponentFixture<FundingListsComponent>;

  beforeEach(async () => {
    const fundingSubmissionsServiceSpy = jasmine.createSpyObj<FundingSubmissionsService>('FundingSubmissionsService', [
      'getListDetail',
      'saveNciDecisions',
      'confirmApprovalsAndRejections'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of(emptyListDetail()));

    await TestBed.configureTestingModule({
      declarations: [FundingListsComponent, Select2TestValueAccessor],
      imports: [FormsModule, RouterTestingModule, NgbTooltipModule, NgbAlertModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: HttpClient, useValue: {} },
        { provide: AppPropertiesService, useValue: { getProperty: () => '' } },
        { provide: LoaderService, useValue: { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') } },
        { provide: NgbModal, useValue: { open: jasmine.createSpy('open') } },
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: NGXLogger, useValue: { error: jasmine.createSpy('error') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FundingListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const field = (): HTMLTextAreaElement =>
    fixture.nativeElement.querySelector('#directorGrantNumbers') as HTMLTextAreaElement;
  const searchButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.grant-number-filter .btn-primary') as HTMLButtonElement;
  const resetButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.grant-number-filter .btn-outline-secondary') as HTMLButtonElement;
  const feedback = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('#directorGrantNumbersFeedback') as HTMLElement | null;
  const enterGrantNumbers = (value: string): void => {
    field().value = value;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  it('renders the label, help and accessible validation only after interaction', () => {
    const label = fixture.nativeElement.querySelector('label[for="directorGrantNumbers"]') as HTMLLabelElement;
    const help = fixture.nativeElement.querySelector('#directorGrantNumbersHelp') as HTMLElement;

    expect(label.textContent.trim()).toBe('Filter by Grant Number(s)');
    expect(help.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Enter at least one Grant Number in the field below. Multiple grant numbers should be separated by a space or comma.'
    );
    expect(searchButton().disabled).toBeTrue();
    expect(feedback()).toBeNull();
    expect(field().getAttribute('aria-invalid')).toBeNull();
    expect(field().getAttribute('aria-describedby')).toBe('directorGrantNumbersHelp');

    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(feedback().textContent.trim()).toBe('At least one Grant Number is required.');
    expect(feedback().classList.contains('invalid-feedback')).toBeTrue();
    expect(feedback().classList.contains('d-block')).toBeTrue();
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(field().getAttribute('aria-describedby')).toBe('directorGrantNumbersHelp directorGrantNumbersFeedback');

    enterGrantNumbers('R01CA000001');
    expect(searchButton().disabled).toBeFalse();
    expect(feedback()).toBeNull();
    enterGrantNumbers('');
    expect(searchButton().disabled).toBeTrue();
    expect(feedback().textContent.trim()).toBe('At least one Grant Number is required.');
  });

  it('enables Search for 1,000 entries, disables it for 1,001, and clears validation on Reset', async () => {
    enterGrantNumbers(Array(1000).fill('R01CA000001').join(', '));
    expect(searchButton().disabled).toBeFalse();
    expect(feedback()).toBeNull();

    enterGrantNumbers(Array(1001).fill('R01CA000001').join(' '));
    expect(searchButton().disabled).toBeTrue();
    expect(feedback().textContent.trim()).toBe('Do not exceed 1,000 Grant Numbers.');
    expect(field().getAttribute('aria-invalid')).toBe('true');

    resetButton().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(field().value).toBe('');
    expect(searchButton().disabled).toBeTrue();
    expect(feedback()).toBeNull();
    expect(field().getAttribute('aria-invalid')).toBeNull();
    expect(field().getAttribute('aria-describedby')).toBe('directorGrantNumbersHelp');
  });

  it('applies the marked DOC only when the rendered Search button is clicked', () => {
    const reloadTable = spyOn<any>(component, 'reloadTable').and.stub();
    component.selectedTab = 'pending';
    component.grants = [
      buildGrant({ applId: 1, doc: 'DCB', grantNumber: 'R01CA000001', nciDecision: null }),
      buildGrant({ applId: 2, doc: 'DCTD', grantNumber: 'U01CA000002', nciDecision: null })
    ];
    fixture.detectChanges();
    const docTiles = fixture.nativeElement.querySelectorAll('.doc-tile') as NodeListOf<HTMLButtonElement>;
    docTiles[0].click();
    fixture.detectChanges();
    expect(docTiles[0].classList.contains('active')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.doc-summary').textContent).toContain('DCB Recommended Total');
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
    expect(reloadTable).not.toHaveBeenCalled();

    enterGrantNumbers('r01ca000001, u01ca000002');
    searchButton().click();
    fixture.detectChanges();
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
    expect(reloadTable).toHaveBeenCalledTimes(1);

    let response: { data: FundingSubmissionListGrantDto[] };
    component.dtOptions.ajax({}, (result: { data: FundingSubmissionListGrantDto[] }) => response = result);
    expect(response.data.map(grant => grant.applId)).toEqual([1]);

    docTiles[1].click();
    fixture.detectChanges();
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
    expect(reloadTable).toHaveBeenCalledTimes(1);
    searchButton().click();
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([2]);
    expect(reloadTable).toHaveBeenCalledTimes(2);
  });
});
