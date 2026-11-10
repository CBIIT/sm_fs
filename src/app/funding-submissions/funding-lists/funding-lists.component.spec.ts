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
import { NciDecisionCellRendererComponent } from '../../table-cell-renderers/nci-decision-cell-renderer/nci-decision-cell-renderer.component';
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

    it('treats zero entries as valid and rejects only more than 1,000 entries', () => {
      component.selectedRows.set(1, component.grants[0]);
      component.selectDoc('DCB');
      component.grantNumbers = ' , \n ';
      expect(component.grantNumberValidationMessage).toBeNull();
      component.searchGrantNumbers();
      expect((component as any).appliedGrantNumbers).toBeNull();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 3]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(1);

      component.grantNumbers = Array(1000).fill('R01CA000001').join(' ');
      expect(component.grantNumberValidationMessage).toBeNull();
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(2);

      component.selectedRows.set(1, component.grants[0]);
      component.selectDoc('DCTD');
      component.grantNumbers += ', R01CA000001';
      expect(component.grantNumberValidationMessage).toBe('Do not exceed 1,000 Grant Numbers.');
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.selectedRows.has(1)).toBeTrue();
      expect(reloadTable).toHaveBeenCalledTimes(2);
    });

    it('shows over-limit feedback on Search without prior interaction and leaves the applied search unchanged', () => {
      component.grantNumbers = 'R01CA000001';
      component.searchGrantNumbers();
      component.selectedRows.set(1, component.grants[0]);
      component.grantNumbersInteracted = false;
      component.grantNumbers = Array(1001).fill('R01CA000001').join(',');
      expect(component.showGrantNumberValidation).toBeFalse();

      component.searchGrantNumbers();

      expect(component.grantNumbersInteracted).toBeTrue();
      expect(component.showGrantNumberValidation).toBeTrue();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.selectedRows.has(1)).toBeTrue();
      expect(reloadTable).toHaveBeenCalledTimes(1);
    });

    it('shows all DOCs in the current tab when Search has no DOC and no grant numbers', () => {
      component.selectedTab = 'pending';
      component.selectedRows.set(1, component.grants[0]);

      component.searchGrantNumbers();

      expect((component as any).appliedGrantNumbers).toBeNull();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
      expect(component.selectedRows.size).toBe(0);
      expect(reloadTable).toHaveBeenCalledTimes(1);
    });

    it('applies a DOC-only Search within the current tab', () => {
      component.selectDoc('DCTD');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2, 3, 4]);

      component.searchGrantNumbers();

      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([2, 4]);
      expect(reloadTable).toHaveBeenCalledTimes(1);
    });

    it('removes the grant-number restriction when the text is cleared and Search is clicked again', () => {
      component.selectDoc('DCB');
      component.grantNumbers = 'R01CA000001';
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);

      component.grantNumbers = '';
      component.searchGrantNumbers();
      expect((component as any).appliedGrantNumbers).toBeNull();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 3]);

      component.selectDoc('');
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2, 3, 4]);
      expect(reloadTable).toHaveBeenCalledTimes(3);
    });

    it('keeps a DOC-only search across tabs, including when the DOC is unavailable', () => {
      component.selectDoc('DCB');
      component.searchGrantNumbers();
      component.selectDoc('DCTD');
      component.selectedRows.set(1, component.grants[0]);

      component.selectTab('pending');
      expect(component.selectedDoc).toBe('DCB');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1]);
      expect(component.selectedRows.size).toBe(0);
      component.selectTab('hold');
      expect(component.availableDocs).toEqual(['DCTD']);
      expect(component.selectedDoc).toBe('DCB');
      expect(component.filteredGrants).toEqual([]);
      component.selectTab('approved');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([3]);
    });

    it('resets a DOC-only search to all DOCs on the same tab', () => {
      component.selectTab('pending');
      component.selectDoc('DCTD');
      component.searchGrantNumbers();
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([2]);
      reloadTable.calls.reset();

      component.resetGrantNumberSearch();

      expect(component.selectedTab).toBe('pending');
      expect(component.selectedDoc).toBe('');
      expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
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

  ['Approve', 'Hold', 'Rejected'].forEach(decision => {
    it(`refreshes saved decision metadata before rendering formatted ${decision}`, () => {
      spyOn(window, 'scrollTo');
      const reload = spyOn<any>(component, 'reloadTable').and.stub();
      const saveResponse = new Subject<any>();
      const detailResponse = new Subject<any>();
      fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(saveResponse);
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(detailResponse);
      const grant = buildGrant({
        applId: 42, nciDecision: 'Hold', nciDecisionByName: 'Previous Reviewer', nciDecisionDate: '2026-10-01'
      });
      component.listId = 39;
      component.grants = [grant];
      component.selectedTab = 'all';
      component.selectedDoc = 'DCB';
      component.selectedRows.set(42, grant);
      (component as any).pendingDecision = decision;
      (component as any).pendingDecisionGrant = grant;
      component.pendingDecisionNote = 'Approved note';

      component.onConfirmGrantDecision();
      expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
      saveResponse.next({ listId: 39, updatedCount: 1 });
      saveResponse.complete();
      expect(fundingSubmissionsServiceSpy.getListDetail).toHaveBeenCalledWith(39);
      expect(grant.nciDecisionByName).toBeUndefined();
      expect(grant.nciDecisionDate).toBeUndefined();

      detailResponse.next({ ...emptyListDetail(), grants: [{
        ...grant, nciDecision: decision, nciDecisionByName: 'Current Reviewer',
        nciDecisionDate: '2026-11-10', nciDirectorNotes: 'Approved note'
      }] });
      detailResponse.complete();

      const expected = `${decision === 'Approve' ? 'Approved' : decision} by Current Reviewer on 11/10/2026`;
      const renderer = new NciDecisionCellRendererComponent();
      renderer.data = grant;
      expect(renderer.decisionDisplay).toBe(expected);
      const column = component.dtOptions.columns.find((candidate: any) => candidate.title === 'NCI Decision');
      expect(column.render(grant.nciDecision, 'filter', grant)).toBe(expected);
      expect(column.render(grant.nciDecision, 'export', grant)).toBe(expected);
      expect(component.selectedRows.get(42)).toBe(grant);
      expect(component.selectedTab).toBe('all');
      expect(component.selectedDoc).toBe('DCB');
      expect(reload).toHaveBeenCalled();
    });
  });

  it('keeps the saved decision and warns when its metadata refresh fails', () => {
    spyOn(window, 'scrollTo');
    spyOn<any>(component, 'reloadTable').and.stub();
    const grant = buildGrant({ applId: 42, nciDecision: 'Hold', nciDecisionByName: 'Old Reviewer', nciDecisionDate: '2026-10-01' });
    component.grants = [grant];
    component.selectedRows.set(42, grant);
    (component as any).pendingDecision = 'Approve';
    (component as any).pendingDecisionGrant = grant;
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(throwError(() => new Error('Refresh failed')));

    component.onConfirmGrantDecision();

    expect(grant.nciDecision).toBe('Approve');
    expect(grant.nciDecisionByName).toBeUndefined();
    expect(grant.nciDecisionDate).toBeUndefined();
    expect(component.grants).toEqual([grant]);
    expect(component.selectedRows.get(42)).toBe(grant);
    expect(component.decisionSuccessMessage).toContain('has been approved');
    expect(component.loadErrorMessage).toContain('The decision was saved, but its details could not be refreshed');
    expect(component.pendingDecisionValidationMessage).toBe('');
  });

  it('does not refresh metadata when saving the decision fails', () => {
    const grant = buildGrant({ nciDecision: 'Hold', nciDecisionByName: 'Previous Reviewer' });
    (component as any).pendingDecision = 'Approve';
    (component as any).pendingDecisionGrant = grant;
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(throwError(() => ({ status: 409 })));

    component.onConfirmGrantDecision();

    expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
    expect(grant.nciDecision).toBe('Hold');
    expect(grant.nciDecisionByName).toBe('Previous Reviewer');
    expect(component.pendingDecisionValidationMessage).toContain('locked');
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
  const counter = (): HTMLElement =>
    fixture.nativeElement.querySelector('#directorGrantNumbersCounter') as HTMLElement;
  // Karma omits the app's global Bootstrap styles, so apply its border-box sizing for production geometry.
  const useBootstrapFieldBoxSizing = (): void => {
    field().style.boxSizing = 'border-box';
  };
  const makeDirectorGrantNumbers = (count: number): string[] =>
    Array.from({ length: count }, (_, index) => `1R01CA${String(100000 + index)}-01`);
  const enterGrantNumbers = (value: string): void => {
    field().value = value;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  it('renders the Filter and Search heading with a decorative rule after the tabs', () => {
    const root = fixture.nativeElement as HTMLElement;
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const heading = headings.find(element => element.textContent.trim() === 'Filter and Search');

    expect(heading).withContext('Filter and Search heading').toBeDefined();
    if (!heading) {
      return;
    }

    const rule = heading.nextElementSibling as HTMLElement;
    expect(heading.tagName).toBe('H2');
    expect(heading.classList.contains('flex-shrink-0')).toBeTrue();
    expect(heading.parentElement.classList.contains('d-flex')).toBeTrue();
    expect(rule.tagName).toBe('HR');
    expect(rule.classList.contains('flex-grow-1')).toBeTrue();
    expect(rule.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.tabs').compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(heading.compareDocumentPosition(root.querySelector('#directorDocFilterLabel')) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it('introduces and accessibly labels the DOC button group before the grant filter', () => {
    component.selectedTab = 'pending';
    component.grants = [
      buildGrant({ applId: 1, doc: 'DCB', nciDecision: null }),
      buildGrant({ applId: 2, doc: 'DCTD', nciDecision: null })
    ];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const label = root.querySelector('#directorDocFilterLabel') as HTMLElement;
    const help = root.querySelector('#directorDocFilterHelp') as HTMLElement;
    const group = root.querySelector('.doc-filters') as HTMLElement;
    const grantFilter = root.querySelector('.grant-number-filter') as HTMLElement;
    const labelText = label.querySelector('strong');

    expect(label.tagName).toBe('DIV');
    expect(labelText.textContent.trim()).toBe('Filter by DOC(s):');
    expect(help.tagName).toBe('P');
    expect(help.textContent.trim()).toBe('Select a DOC and click Search to filter the table below.');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(group.getAttribute('aria-describedby')).toBe(help.id);
    expect(group.contains(label)).toBeFalse();
    expect(group.contains(help)).toBeFalse();
    expect(group.querySelectorAll('button.doc-tile').length).toBe(2);
    expect(label.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(help.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(group.compareDocumentPosition(grantFilter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('preserves active tab and DOC tile colors over their base styles', () => {
    component.grants = [buildGrant({ doc: 'DCB' })];
    fixture.detectChanges();
    const tile = fixture.nativeElement.querySelector('.doc-tile') as HTMLButtonElement;
    tile.click();
    fixture.detectChanges();

    const activeTab = fixture.nativeElement.querySelector('.tab-btn.active') as HTMLElement;
    [activeTab, tile].forEach(element => {
      expect(element.classList.contains('active')).toBeTrue();
      const style = getComputedStyle(element);
      expect(style.backgroundColor).toBe('rgb(15, 130, 192)');
      expect(style.color).toBe('rgb(255, 255, 255)');
      expect(style.borderTopColor).toBe('rgb(15, 130, 192)');
    });
  });

  it('styles unscoped DataTables fixed cells through odd, shown and open-menu states', () => {
    const table = document.createElement('table');
    table.className = 'dataTable';
    table.innerHTML = `
      <thead><tr><th class="dtfc-fixed-left">Select</th><th class="dtfc-fixed-right">Process</th></tr></thead>
      <tbody><tr>
        <td class="dtfc-fixed-left">Grant</td>
        <td class="dtfc-fixed-right"><div class="process-dropdown-wrap">
          <button class="process-toggle locked"><i class="fa-lock"></i>Process</button>
          <div class="process-menu">Actions</div>
        </div></td>
      </tr></tbody>`;
    fixture.nativeElement.querySelector('.funding-lists-page').appendChild(table);
    try {
      const row = table.tBodies[0].rows[0];
      const left = row.cells[0];
      const right = row.cells[1];
      const headers = table.tHead.rows[0].cells;
      expect(left.getAttributeNames().some(name => name.startsWith('_ngcontent'))).toBeFalse();
      [headers[0], headers[1], left, right].forEach(cell => {
        expect(getComputedStyle(cell).backgroundColor).toBe('rgb(255, 255, 255)');
      });
      expect(getComputedStyle(headers[0]).zIndex).toBe('2');
      expect(getComputedStyle(headers[1]).zIndex).toBe('5');
      expect(getComputedStyle(left).zIndex).toBe('2');
      expect(getComputedStyle(right).zIndex).toBe('5');
      row.className = 'odd';
      [left, right].forEach(cell => expect(getComputedStyle(cell).backgroundColor).toBe('rgb(249, 249, 249)'));
      row.classList.add('shown');
      [left, right].forEach(cell => expect(getComputedStyle(cell).backgroundColor).toBe('rgb(238, 243, 255)'));
      expect(getComputedStyle(right).overflow).toBe('visible');
      right.classList.add('menu-open');
      expect(getComputedStyle(right).zIndex).toBe('50');
      const menu = table.querySelector('.process-menu') as HTMLElement;
      expect(getComputedStyle(menu).position).toBe('absolute');
      expect(getComputedStyle(menu).zIndex).toBe('2000');
      const toggle = table.querySelector('button') as HTMLButtonElement;
      [false, true].forEach(disabled => {
        toggle.disabled = disabled;
        const style = getComputedStyle(toggle);
        expect(style.backgroundColor).toBe('rgb(230, 247, 233)');
        expect(style.borderTopColor).toBe('rgb(8, 143, 39)');
        expect(style.color).toBe('rgb(0, 0, 0)');
        expect(style.opacity).toBe('1');
      });
    } finally {
      table.remove();
    }
  });

  it('keeps fixed-cell rules page-scoped and detail content sticky', () => {
    const outside = document.createElement('table');
    outside.className = 'dataTable';
    outside.innerHTML = '<tbody><tr class="odd shown"><td class="dtfc-fixed-left">Outside</td></tr></tbody>';
    document.body.appendChild(outside);
    const detail = document.createElement('div');
    detail.className = 'detail-row-sticky';
    fixture.nativeElement.querySelector('.funding-lists-page').appendChild(detail);
    try {
      expect(getComputedStyle(outside.querySelector('td')).backgroundColor).not.toBe('rgb(238, 243, 255)');
      fixture.nativeElement.querySelector('.funding-lists-page').appendChild(outside);
      expect(getComputedStyle(outside.querySelector('td')).backgroundColor).toBe('rgb(238, 243, 255)');
      expect(getComputedStyle(detail).position).toBe('sticky');
      expect(getComputedStyle(detail).left).toBe('0px');
      expect(getComputedStyle(detail).zIndex).toBe('3');
    } finally {
      outside.remove();
      detail.remove();
    }
  });

  it('renders the optional help, enabled Search and accessible validation only when over the limit', () => {
    const label = fixture.nativeElement.querySelector('label[for="directorGrantNumbers"]') as HTMLLabelElement;
    const help = fixture.nativeElement.querySelector('#directorGrantNumbersHelp') as HTMLElement;

    expect(label.textContent.trim()).toBe('Filter by Grant Number(s)');
    expect(help.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Grant Numbers are optional. Multiple grant numbers should be separated by a space or comma.'
    );
    expect(searchButton().disabled).toBeFalse();
    expect(searchButton().hasAttribute('disabled')).toBeFalse();
    expect(feedback()).toBeNull();
    expect(field().getAttribute('aria-invalid')).toBeNull();
    expect(field().getAttribute('aria-describedby')).toBe('directorGrantNumbersHelp directorGrantNumbersCounter');

    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(feedback()).toBeNull();
    expect(field().getAttribute('aria-invalid')).toBeNull();
    expect(searchButton().disabled).toBeFalse();

    enterGrantNumbers(makeDirectorGrantNumbers(1001).join(' '));
    expect(feedback().textContent.trim()).toBe('Do not exceed 1,000 Grant Numbers.');
    expect(feedback().classList.contains('invalid-feedback')).toBeTrue();
    expect(feedback().classList.contains('d-block')).toBeTrue();
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(field().getAttribute('aria-describedby')).toBe(
      'directorGrantNumbersHelp directorGrantNumbersCounter directorGrantNumbersFeedback'
    );
    expect(searchButton().disabled).toBeFalse();

    enterGrantNumbers('');
    expect(searchButton().disabled).toBeFalse();
    expect(feedback()).toBeNull();
  });

  it('shows over-limit feedback when Search is clicked before field interaction', () => {
    const reloadTable = spyOn<any>(component, 'reloadTable').and.stub();
    component.grantNumbers = makeDirectorGrantNumbers(1001).join(',');
    fixture.detectChanges();
    expect(feedback()).toBeNull();

    searchButton().click();
    fixture.detectChanges();

    expect(feedback().textContent.trim()).toBe('Do not exceed 1,000 Grant Numbers.');
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(reloadTable).not.toHaveBeenCalled();
  });

  it('keeps Search enabled for 1,000 and 1,001 entries and clears validation on Reset', async () => {
    enterGrantNumbers(Array(1000).fill('R01CA000001').join(', '));
    expect(searchButton().disabled).toBeFalse();
    expect(feedback()).toBeNull();

    enterGrantNumbers(Array(1001).fill('R01CA000001').join(' '));
    expect(searchButton().disabled).toBeFalse();
    expect(feedback().textContent.trim()).toBe('Do not exceed 1,000 Grant Numbers.');
    expect(field().getAttribute('aria-invalid')).toBe('true');

    resetButton().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(field().value).toBe('');
    expect(searchButton().disabled).toBeFalse();
    expect(feedback()).toBeNull();
    expect(field().getAttribute('aria-invalid')).toBeNull();
    expect(field().getAttribute('aria-describedby')).toBe('directorGrantNumbersHelp directorGrantNumbersCounter');
  });

  it('renders an associated 0/1000 counter without a character maxlength', () => {
    expect(counter().textContent.trim()).toBe('0/1000');
    expect(counter().classList.contains('grant-number-counter')).toBeTrue();
    expect(field().hasAttribute('maxlength')).toBeFalse();
    expect(field().maxLength).toBe(-1);
    expect(field().getAttribute('aria-describedby').split(' ')).toContain('directorGrantNumbersCounter');
    expect(feedback()).toBeNull();
  });

  it('counts parsed entries live across mixed separators, including duplicates, without changing validation', () => {
    const reloadTable = spyOn<any>(component, 'reloadTable').and.stub();

    enterGrantNumbers(' ,\r\n \t , ');
    expect(counter().textContent.trim()).toBe('0/1000');
    expect(feedback()).toBeNull();
    expect(searchButton().disabled).toBeFalse();

    enterGrantNumbers('1R01CA000001-01');
    expect(counter().textContent.trim()).toBe('1/1000');
    expect(feedback()).toBeNull();
    expect(searchButton().disabled).toBeFalse();

    enterGrantNumbers('1R01CA000001-01, 1r01ca000001-01\n2U01CA000002-02 \t3P01CA000003-03,,');
    expect(counter().textContent.trim()).toBe('4/1000');
    expect(searchButton().disabled).toBeFalse();

    searchButton().click();
    fixture.detectChanges();
    expect(reloadTable).toHaveBeenCalled();
    expect((component as any).appliedGrantNumbers.size).toBe(3);
    expect(counter().textContent.trim()).toBe('4/1000');

    enterGrantNumbers('1R01CA000001-01, 1r01ca000001-01');
    expect(counter().textContent.trim()).toBe('2/1000');
  });

  it('shows unclamped 1,000 and 1,001 boundaries for long input, updates on correction, and resets to 0/1000', async () => {
    spyOn<any>(component, 'reloadTable').and.stub();
    const grants = makeDirectorGrantNumbers(1001);
    const validInput = grants.slice(0, 1000).join('\n');
    expect(validInput.length).toBeGreaterThan(1000);
    expect(field().hasAttribute('maxlength')).toBeFalse();

    enterGrantNumbers(validInput);
    expect(field().value).toBe(validInput);
    expect(counter().textContent.trim()).toBe('1000/1000');
    expect(feedback()).toBeNull();
    expect(searchButton().disabled).toBeFalse();

    const invalidInput = grants.join(', ');
    enterGrantNumbers(invalidInput);
    expect(field().value).toBe(invalidInput);
    expect(counter().textContent.trim()).toBe('1001/1000');
    expect(feedback().textContent.trim()).toBe('Do not exceed 1,000 Grant Numbers.');
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(searchButton().disabled).toBeFalse();

    enterGrantNumbers(grants.slice(1).join(' '));
    expect(counter().textContent.trim()).toBe('1000/1000');
    expect(feedback()).toBeNull();
    expect(searchButton().disabled).toBeFalse();

    resetButton().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(field().value).toBe('');
    expect(counter().textContent.trim()).toBe('0/1000');
    expect(feedback()).toBeNull();
    expect(searchButton().disabled).toBeFalse();
  });

  it('right-aligns the counter below the field with and without validation feedback', () => {
    useBootstrapFieldBoxSizing();
    const metaRow = fixture.nativeElement.querySelector('.grant-number-filter .grant-number-text-meta') as HTMLElement;
    expect(counter().parentElement).toBe(metaRow);

    let fieldRect = field().getBoundingClientRect();
    let counterRect = counter().getBoundingClientRect();
    expect(counterRect.width).toBeGreaterThan(0);
    expect(counterRect.top).toBeGreaterThanOrEqual(fieldRect.bottom);
    expect(counterRect.top - fieldRect.bottom).toBeLessThanOrEqual(8);
    expect(Math.abs(counterRect.right - fieldRect.right)).toBeLessThanOrEqual(1);
    expect(counterRect.left).toBeGreaterThan(fieldRect.left + fieldRect.width / 2);

    enterGrantNumbers(makeDirectorGrantNumbers(1001).join(' '));
    fieldRect = field().getBoundingClientRect();
    counterRect = counter().getBoundingClientRect();
    const feedbackRect = feedback().getBoundingClientRect();
    expect(feedback().parentElement).toBe(metaRow);
    expect(feedbackRect.top).toBeGreaterThanOrEqual(fieldRect.bottom);
    expect(feedbackRect.top - fieldRect.bottom).toBeLessThanOrEqual(8);
    expect(Math.abs(feedbackRect.left - fieldRect.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(feedbackRect.top - counterRect.top)).toBeLessThanOrEqual(4);
    expect(feedbackRect.right).toBeLessThanOrEqual(counterRect.left);
    expect(Math.abs(counterRect.right - fieldRect.right)).toBeLessThanOrEqual(1);
  });

  it('keeps validation feedback and the counter readable when the row wraps at a narrow width', () => {
    const filter = fixture.nativeElement.querySelector('.grant-number-filter') as HTMLElement;
    useBootstrapFieldBoxSizing();
    filter.style.width = '180px';
    enterGrantNumbers(makeDirectorGrantNumbers(1001).join(','));

    const fieldRect = field().getBoundingClientRect();
    const counterRect = counter().getBoundingClientRect();
    const feedbackRect = feedback().getBoundingClientRect();
    expect(counter().textContent.trim()).toBe('1001/1000');
    expect(feedback().textContent.trim()).toBe('Do not exceed 1,000 Grant Numbers.');
    expect(feedbackRect.width).toBeGreaterThan(0);
    expect(counterRect.width).toBeGreaterThan(0);
    expect(feedbackRect.left).toBeGreaterThanOrEqual(fieldRect.left - 1);
    expect(feedbackRect.right).toBeLessThanOrEqual(fieldRect.right + 1);
    expect(counterRect.top).toBeGreaterThanOrEqual(feedbackRect.bottom - 1);
    expect(Math.abs(counterRect.right - fieldRect.right)).toBeLessThanOrEqual(1);
    expect(counter().scrollWidth).toBeLessThanOrEqual(Math.ceil(counterRect.width));
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

  it('applies a rendered DOC-only Search and returns to all DOCs after Reset', async () => {
    const reloadTable = spyOn<any>(component, 'reloadTable').and.stub();
    component.selectedTab = 'pending';
    component.grants = [
      buildGrant({ applId: 1, doc: 'DCB', grantNumber: 'R01CA000001', nciDecision: null }),
      buildGrant({ applId: 2, doc: 'DCTD', grantNumber: 'U01CA000002', nciDecision: null })
    ];
    fixture.detectChanges();
    const docTiles = fixture.nativeElement.querySelectorAll('.doc-tile') as NodeListOf<HTMLButtonElement>;

    searchButton().click();
    fixture.detectChanges();
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);

    docTiles[1].click();
    fixture.detectChanges();
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
    expect(searchButton().disabled).toBeFalse();
    searchButton().click();
    fixture.detectChanges();
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([2]);
    expect(counter().textContent.trim()).toBe('0/1000');
    expect(feedback()).toBeNull();

    let response: { data: FundingSubmissionListGrantDto[] };
    component.dtOptions.ajax({}, (result: { data: FundingSubmissionListGrantDto[] }) => response = result);
    expect(response.data.map(grant => grant.applId)).toEqual([2]);

    resetButton().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.selectedTab).toBe('pending');
    expect(component.filteredGrants.map(grant => grant.applId)).toEqual([1, 2]);
    expect(counter().textContent.trim()).toBe('0/1000');
    expect(searchButton().disabled).toBeFalse();
    expect(reloadTable).toHaveBeenCalledTimes(3);
  });
});
