import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { NgSelect2Module } from 'ng-select2';
import { of, Subject, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { roleNames } from '../../../service/role-names';

import { GrantDetailComponent } from './grant-detail.component';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { DocumentService } from '../../../service/document.service';

describe('GrantDetailComponent', () => {
  let component: GrantDetailComponent;
  let fixture: ComponentFixture<GrantDetailComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsService>;
  let dropdownLookupServiceSpy: jasmine.SpyObj<FundingSubmDropdownLookupService>;
  let userSessionServiceSpy: jasmine.SpyObj<AppUserSessionService>;
  let documentServiceSpy: jasmine.SpyObj<DocumentService>;
  let getJustificationSubject: Subject<any>;
  // Budget Categories Race Condition fix (2026-08-25): hoisted alongside getJustificationSubject
  // (mirroring the FS-2043 test harness pattern) so individual tests can swap
  // getBudgetCategories() to simulate an in-flight/delayed/errored fetch, exactly as
  // getJustificationSubject already does for refreshJustificationData().
  let getBudgetCategoriesSubject: Subject<any>;

  beforeEach(async () => {
    getJustificationSubject = new Subject<any>();
    getBudgetCategoriesSubject = new Subject<any>();

    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', [
      'getJustification', 'saveJustificationForm', 'bulkUpdateListGrants'
    ]);
    fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());

    dropdownLookupServiceSpy = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
      'getDocDecisions', 'getAnnualFundingR01Options', 'getAnnualOrMyfOptions',
      'getBudgetCategories', 'getDocNciSelections'
    ]);
    dropdownLookupServiceSpy.getDocDecisions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualFundingR01Options.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualOrMyfOptions.and.returnValue(of([]));
    // Default: synchronous resolution (matches pre-existing test harness behavior for the other
    // four dropdowns) so existing tests that call onEdit() without caring about this race are
    // unaffected. Individual Budget Categories race-condition tests below re-stub this to
    // getBudgetCategoriesSubject.asObservable() to simulate an in-flight fetch.
    dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(of([]));
    dropdownLookupServiceSpy.getDocNciSelections.and.returnValue(of([]));

    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    propertiesServiceSpy.getProperty.and.returnValue('http://grant-viewer/');

    userSessionServiceSpy = jasmine.createSpyObj('AppUserSessionService', ['hasRole']);
    userSessionServiceSpy.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);

    documentServiceSpy = jasmine.createSpyObj('DocumentService', ['downloadById']);
    documentServiceSpy.downloadById.and.returnValue(of({
      body: new Blob(['doc-content']),
      headers: { get: () => 'application/pdf' }
    } as any));

    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NgSelect2Module],
      declarations: [GrantDetailComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: AppUserSessionService, useValue: userSessionServiceSpy },
        { provide: DocumentService, useValue: documentServiceSpy },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GrantDetailComponent);
    component = fixture.componentInstance;
    component.listId = 1;
    component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
  });

  it('should create', () => {
    fixture.detectChanges();
    getJustificationSubject.complete();
    expect(component).toBeTruthy();
  });

  it('ngOnInit eagerly subscribes and loads justification data', () => {
    component.ngOnInit();

    expect(fundingSubmissionsServiceSpy.getJustification).toHaveBeenCalledWith(1, 100);

    getJustificationSubject.next({
      justificationText: 'Loaded during initialization',
      documents: [{ id: 1, docFilename: 'initial.pdf' }]
    });

    expect(component.justificationLoaded).toBeTrue();
    expect(component.data.justificationText).toBe('Loaded during initialization');
    expect(component.justificationDocuments).toEqual([{ id: 1, docFilename: 'initial.pdf' }]);
  });

  it('ngOnChanges eagerly subscribes and loads justification data for a changed row', () => {
    component.justificationLoaded = true;

    component.ngOnChanges({ data: {} as any });

    expect(component.justificationLoaded).toBeFalse();
    expect(fundingSubmissionsServiceSpy.getJustification).toHaveBeenCalledWith(1, 100);

    getJustificationSubject.next({
      justificationText: 'Loaded after row change',
      documents: [{ id: 2, docFilename: 'changed-row.pdf' }]
    });

    expect(component.justificationLoaded).toBeTrue();
    expect(component.data.justificationText).toBe('Loaded after row change');
    expect(component.justificationDocuments).toEqual([{ id: 2, docFilename: 'changed-row.pdf' }]);
  });

  it('allows Edit when user does not have DOC role once data is loaded', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();

    component.docFundingListCor = false;
    component.listStatus = 'DOC Review';

    component.onEdit();

    expect(component.isEditMode).toBeTrue();
  });

  it('allows Edit when list status is not DOC Review once data is loaded', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();

    component.docFundingListCor = true;
    component.listStatus = 'Draft';

    component.onEdit();

    expect(component.isEditMode).toBeTrue();
  });

  it('renders project title, previous score, pfr, and recusedFlag in read-only mode', () => {
    component.data = {
      applId: 100,
      grantNumber: '1R01CA123456-01',
      projectTitle: 'FS-2214 Title',
      previousScore: 'n/a',
      pfr: 321,
      recusedFlag: 'Yes',
      justificationText: ''
    };

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('FS-2214 Title');
    expect(text).toContain('n/a');
    expect(text).toContain('321');
    expect(text).toContain('Yes');
  });

  it('renders placeholder when recusedFlag or pfr is blank', () => {
    component.data = {
      applId: 100,
      grantNumber: '1R01CA123456-01',
      projectTitle: '',
      previousScore: '',
      pfr: null,
      recusedFlag: '',
      justificationText: ''
    };

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Recused:');
    expect(text).toContain('PFR:');
    expect(text).toContain('-');
  });

  it('renders applicationTotalCostEstimate as currency in read-only mode', () => {
    component.data = {
      applId: 100,
      grantNumber: '1R01CA123456-01',
      applicationTotalCostEstimate: 125000,
      justificationText: ''
    };

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('$125,000');
  });

  describe('PFR hyperlink (2026-08-26 follow-up)', () => {
    it('pfrRouterLink resolves to /plan/retrieve for pfrType "Plan"', () => {
      component.data = { applId: 100, pfr: 321, pfrType: 'Plan', justificationText: '' };
      expect(component.pfrRouterLink).toEqual(['/plan/retrieve', 321]);
    });

    it('pfrRouterLink resolves to /request/retrieve for pfrType "Request"', () => {
      component.data = { applId: 100, pfr: 654, pfrType: 'Request', justificationText: '' };
      expect(component.pfrRouterLink).toEqual(['/request/retrieve', 654]);
    });

    it('pfrRouterLink is null when pfr is absent', () => {
      component.data = { applId: 100, pfr: null, pfrType: 'Plan', justificationText: '' };
      expect(component.pfrRouterLink).toBeNull();
    });

    it('pfrRouterLink is null when pfrType is absent or unrecognized', () => {
      component.data = { applId: 100, pfr: 321, pfrType: null, justificationText: '' };
      expect(component.pfrRouterLink).toBeNull();

      component.data = { applId: 100, pfr: 321, pfrType: 'Bogus', justificationText: '' };
      expect(component.pfrRouterLink).toBeNull();
    });

    it('renders PFR as a hyperlink when both pfr and pfrType are present', () => {
      component.data = { applId: 100, pfr: 321, pfrType: 'Plan', justificationText: '' };

      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      fixture.detectChanges();

      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/plan/retrieve/321"]');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('321');
    });

    it('renders PFR as plain text (no hyperlink) when pfrType is missing', () => {
      component.data = { applId: 100, pfr: 321, pfrType: null, justificationText: '' };

      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('a[href^="/plan/retrieve"], a[href^="/request/retrieve"]');
      expect(link).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain('321');
    });
  });

  it('renders fields in read-only mode without entering edit mode controls', () => {
    component.isEditMode = false;
    component.data = {
      applId: 100,
      grantNumber: '1R01CA123456-01',
      projectTitle: 'Read Only Title',
      previousScore: '15',
      pfr: 555,
      recusedFlag: 'No',
      justificationText: ''
    };

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Read Only Title');
    expect(compiled.textContent).toContain('15');
    expect(compiled.textContent).toContain('555');
    expect(compiled.textContent).toContain('No');
  });

  it('should not populate the form from onEdit() until the initial justification fetch resolves', () => {
    fixture.detectChanges(); // ngOnInit() -> refreshJustificationData() (in flight)

    expect(component.justificationLoaded).toBeFalse();

    // Simulate a click on the (still-disabled) Edit button before the fetch resolves.
    component.onEdit();
    expect(component.isEditMode).toBeFalse();
    expect(component.formModel.justificationText).toBeUndefined();

    // Fetch resolves with a previously-saved justification.
    getJustificationSubject.next({ justificationText: 'Previously saved justification' });
    getJustificationSubject.complete();

    expect(component.justificationLoaded).toBeTrue();
    expect(component.data.justificationText).toBe('Previously saved justification');

    // Now Edit is expected to work and pick up the resolved value.
    component.onEdit();
    expect(component.isEditMode).toBeTrue();
    expect(component.formModel.justificationText).toBe('Previously saved justification');
  });

  it('should populate the form correctly once a delayed fetch resolves, instead of leaving it blank', () => {
    fixture.detectChanges();

    getJustificationSubject.next({ justificationText: 'Delayed justification text' });
    getJustificationSubject.complete();

    component.onEdit();

    expect(component.formModel.justificationText).toBe('Delayed justification text');
  });

  it('should still allow Edit mode to be reached if the justification fetch errors out', () => {
    fixture.detectChanges();

    expect(component.justificationLoaded).toBeFalse();

    getJustificationSubject.error(new Error('network error'));

    expect(component.justificationLoaded).toBeTrue();

    component.onEdit();
    expect(component.isEditMode).toBeTrue();
  });

  it('should reset justificationLoaded to false and re-fetch on ngOnChanges() for a new row', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: 'first row text' });
    getJustificationSubject.complete();
    expect(component.justificationLoaded).toBeTrue();

    getJustificationSubject = new Subject<any>();
    fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());

    component.data = { applId: 200, grantNumber: '1R01CA654321-01', justificationText: '' };
    component.ngOnChanges({ data: {} as any });

    expect(component.justificationLoaded).toBeFalse();

    getJustificationSubject.next({ justificationText: 'second row text' });
    getJustificationSubject.complete();
    expect(component.justificationLoaded).toBeTrue();
  });

  // Prompt - Grant Detail Edit Button Budget Categories Race Condition (2026-08-25): mirrors the
  // FS-2043 tests above exactly, adapted for budgetCategoryOptions/budgetCategoriesLoaded — the
  // getBudgetCategories() fetch races onEdit() the same way getJustification() did.
  describe('Budget Categories Race Condition fix (2026-08-25)', () => {
    it('should not populate the form from onEdit() until the initial Budget Categories fetch resolves', () => {
      dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(getBudgetCategoriesSubject.asObservable());

      fixture.detectChanges(); // ngOnInit() -> fetchDropdownOptions() (in flight)
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      expect(component.budgetCategoriesLoaded).toBeFalse();

      // Simulate a click on the (still-disabled) Edit button before the fetch resolves.
      component.onEdit();
      expect(component.isEditMode).toBeFalse();

      // Fetch resolves.
      getBudgetCategoriesSubject.next([{ id: 'ESIR37T4', text: 'ESI R37 T4 Board Competing Transition' }]);
      getBudgetCategoriesSubject.complete();

      expect(component.budgetCategoriesLoaded).toBeTrue();

      // Now Edit is expected to work.
      component.onEdit();
      expect(component.isEditMode).toBeTrue();
    });

    it('should populate the form correctly once a delayed Budget Categories fetch resolves', () => {
      dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(getBudgetCategoriesSubject.asObservable());
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        justificationText: '',
        budgetCategories: 'ESI R37 T4 Board Competing Transition',
        budgetCategoryCode: 'ESIR37T4'
      };

      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      getBudgetCategoriesSubject.next([{ id: 'ESIR37T4', text: 'ESI R37 T4 Board Competing Transition' }]);
      getBudgetCategoriesSubject.complete();

      component.onEdit();

      expect(component.formModel.budgetCategories).toBe('ESIR37T4');
    });

    it('should still allow Edit mode to be reached if the Budget Categories fetch errors out', () => {
      dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(getBudgetCategoriesSubject.asObservable());

      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      expect(component.budgetCategoriesLoaded).toBeFalse();

      getBudgetCategoriesSubject.error(new Error('network error'));

      expect(component.budgetCategoriesLoaded).toBeTrue();

      component.onEdit();
      expect(component.isEditMode).toBeTrue();
    });

    it('should NOT reset budgetCategoriesLoaded on ngOnChanges() for a new row', () => {
      fixture.detectChanges(); // default of([]) resolves synchronously
      getJustificationSubject.next({ justificationText: 'first row text' });
      getJustificationSubject.complete();
      expect(component.budgetCategoriesLoaded).toBeTrue();

      getJustificationSubject = new Subject<any>();
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());

      component.data = { applId: 200, grantNumber: '1R01CA654321-01', justificationText: '' };
      component.ngOnChanges({ data: {} as any });

      // justificationLoaded resets (existing behavior); budgetCategoriesLoaded must NOT — the
      // Budget Categories lookup is grant-independent and fetched once per session (Task 2.3).
      expect(component.justificationLoaded).toBeFalse();
      expect(component.budgetCategoriesLoaded).toBeTrue();

      getJustificationSubject.next({ justificationText: 'second row text' });
      getJustificationSubject.complete();
      expect(component.budgetCategoriesLoaded).toBeTrue();
    });

    it('should block onEdit() until Budget Categories resolves even after justification is already loaded, and onSave() then resolves the correct NAME (not null)', () => {
      dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(getBudgetCategoriesSubject.asObservable());
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        justificationText: '',
        budgetCategories: 'ESI R37 T4 Board Competing Transition',
        budgetCategoryCode: 'ESIR37T4',
        twoYearAnnualFundingR01Flag: false
      };

      fixture.detectChanges();
      // justificationLoaded resolves first; Budget Categories fetch is still pending.
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      expect(component.justificationLoaded).toBeTrue();
      expect(component.budgetCategoriesLoaded).toBeFalse();

      // onEdit() attempted while Budget Categories is still pending must be blocked.
      component.onEdit();
      expect(component.isEditMode).toBeFalse();

      // Budget Categories resolves.
      getBudgetCategoriesSubject.next([{ id: 'ESIR37T4', text: 'ESI R37 T4 Board Competing Transition' }]);
      getBudgetCategoriesSubject.complete();
      expect(component.budgetCategoriesLoaded).toBeTrue();

      // onEdit() now succeeds.
      component.onEdit();
      expect(component.isEditMode).toBeTrue();

      // onSave() -> applyFormModelToData() must resolve the NAME, not fall back to null.
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));
      component.formModel.docDecision = 'Pay';
      component.onSave();

      expect(component.data.budgetCategories).toBe('ESI R37 T4 Board Competing Transition');
    });
  });

  // Prompt - Grant Detail Cancel Reverts to Read-Only (2026-08-25): Cancel should revert to
  // read-only and stay open (isEditMode = false, editModeExited emitted), not tear the row down
  // (close must NOT be emitted). Both Cancel paths must behave identically per operator
  // confirmation — no special-casing.
  describe('Cancel reverts to read-only (does not emit close)', () => {
    beforeEach(() => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: 'Previously saved justification' });
      getJustificationSubject.complete();
      component.onEdit();
      expect(component.isEditMode).toBeTrue();
    });

    it('onCancel() with no unsaved changes emits editModeExited, not close, and reverts to read-only', () => {
      const closeSpy = jasmine.createSpy('close');
      const editModeExitedSpy = jasmine.createSpy('editModeExited');
      component.close.subscribe(closeSpy);
      component.editModeExited.subscribe(editModeExitedSpy);

      component.onCancel();

      expect(component.isEditMode).toBeFalse();
      expect(editModeExitedSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('onCancelWarningProceed() (confirmed-discard path) emits editModeExited, not close, and reverts to read-only', () => {
      const closeSpy = jasmine.createSpy('close');
      const editModeExitedSpy = jasmine.createSpy('editModeExited');
      component.close.subscribe(closeSpy);
      component.editModeExited.subscribe(editModeExitedSpy);

      // Simulate an unsaved change so this exercises the warning-modal path's proceed handler.
      component.formModel.docNotes = 'changed';
      expect(component.hasUnsavedChanges()).toBeTrue();

      component.onCancelWarningProceed();

      expect(component.isEditMode).toBeFalse();
      expect(component.formModel).toEqual({});
      expect(editModeExitedSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('both Cancel paths behave identically: same end state, same output emitted', () => {
      // Fast path (no unsaved changes)
      const editModeExitedSpy = jasmine.createSpy('editModeExited');
      component.editModeExited.subscribe(editModeExitedSpy);
      component.onCancel();
      expect(component.isEditMode).toBeFalse();
      expect(editModeExitedSpy).toHaveBeenCalledTimes(1);

      // Confirmed-discard path (re-enter edit mode, make a change, proceed)
      component.onEdit();
      component.formModel.docNotes = 'changed again';
      component.onCancelWarningProceed();
      expect(component.isEditMode).toBeFalse();
      expect(editModeExitedSpy).toHaveBeenCalledTimes(2);
    });
  });

  // Bulk Edit / Grant Detail CODE-vs-NAME fix (2026-08-25): onEdit() must seed formModel from the
  // grant's budgetCategoryCode (CODE), not the NAME-valued budgetCategories, so it matches the
  // CODE-keyed budgetCategoryOptions Select2 and can pre-select the correct option.
  // Display CODE vs NAME Reconciliation (2026-08-25): Grant Detail's read-only "DOC Decision"
  // span must resolve the raw CODE to its NAME via getDocDecisionDisplay(), falling back to the
  // raw code for an unresolvable value, exactly like the docDecision DataTables column renderer
  // on search-lists.component.ts.
  describe('DOC Decision CODE-vs-NAME display fix (2026-08-25)', () => {
    it('getDocDecisionDisplay() resolves a known CODE to its NAME via decisionOptions', () => {
      component.decisionOptions = [{ id: 'Pay', text: 'Pay' }, { id: 'Do Not Pay', text: 'Do Not Pay' }];

      expect(component.getDocDecisionDisplay('Pay')).toBe('Pay');
      expect(component.getDocDecisionDisplay('Do Not Pay')).toBe('Do Not Pay');
    });

    it('getDocDecisionDisplay() falls back to the raw code for an unresolvable value instead of throwing or blanking out', () => {
      component.decisionOptions = [{ id: 'Pay', text: 'Pay' }];

      expect(component.getDocDecisionDisplay('Some Future Code')).toBe('Some Future Code');
    });

    it('getDocDecisionDisplay() returns an empty string for a null/blank code', () => {
      component.decisionOptions = [{ id: 'Pay', text: 'Pay' }];

      expect(component.getDocDecisionDisplay(null)).toBe('');
      expect(component.getDocDecisionDisplay('')).toBe('');
    });
  });

  describe('Budget Categories CODE-vs-NAME fix (2026-08-25)', () => {
    it('onEdit() seeds formModel.budgetCategories from the grant\'s budgetCategoryCode, not the NAME-valued budgetCategories', () => {
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        justificationText: '',
        budgetCategories: 'ESI R37 T4 Board Competing Transition',
        budgetCategoryCode: 'ESIR37T4'
      };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      component.onEdit();

      expect(component.formModel.budgetCategories).toBe('ESIR37T4');
    });

    it('onSave() sends a CODE-shaped budgetCategories value in the bulkUpdateListGrants() payload', () => {
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        justificationText: '',
        budgetCategories: 'ESI R37 T4 Board Competing Transition',
        budgetCategoryCode: 'ESIR37T4',
        twoYearAnnualFundingR01Flag: false
      };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      component.onEdit();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      // Simulate saving after only a different field was touched (e.g. DOC Decision) — Budget
      // Categories itself is left untouched, exactly the "unedited save" scenario the fix
      // protects against: the CODE seeded in onEdit() must still flow through, not a NAME.
      component.formModel.docDecision = 'Pay';

      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.budgetCategories).toBe('ESIR37T4');
    });
  });

  describe('Justification document download and deferred deletion', () => {
    it('renders justification documents with download metadata and downloads the file on click', () => {
      component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
      component.justificationDocuments = [{
        id: 42,
        docFilename: 'budget.pdf',
        uploadByName: 'Jane Doe',
        createDate: '2026-09-01T00:00:00Z'
      } as any];

      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: component.justificationDocuments });
      getJustificationSubject.complete();
      fixture.detectChanges();

      const downloadButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (button: HTMLButtonElement) => button.textContent.includes('budget.pdf')
      ) as HTMLButtonElement;

      expect(downloadButton).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Added by Jane Doe');

      downloadButton.click();
      expect(documentServiceSpy.downloadById).toHaveBeenCalledWith(42);
    });

    it('stages a persisted document for deferred deletion and resets it on cancel', () => {
      component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
      component.justificationDocuments = [{ id: 7, docFilename: 'keep-me.pdf' } as any];
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: component.justificationDocuments });
      getJustificationSubject.complete();

      component.onEdit();
      component.onRemovePersistedDocument(7);
      expect(component.stagedDeleteDocumentIds).toEqual([7]);
      expect(component.visiblePersistedDocuments.length).toBe(0);

      (component as any).discardEditsAndClose();
      expect(component.stagedDeleteDocumentIds).toEqual([]);
      expect(component.visiblePersistedDocuments.length).toBe(1);
    });

    it('passes deleteDocumentIds to saveJustificationForm when persisted files are removed', () => {
      component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
      component.justificationDocuments = [{ id: 9, docFilename: 'remove-me.pdf' } as any];
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: component.justificationDocuments });
      getJustificationSubject.complete();

      component.onEdit();
      component.onRemovePersistedDocument(9);
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm).toHaveBeenCalledWith(
        1,
        100,
        undefined,
        undefined,
        [9]
      );
    });

    it('disables file upload when justification text is entered and disables text when files are attached', () => {
      component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: [] });
      getJustificationSubject.complete();
      component.onEdit();

      component.formModel.justificationText = 'Entered text';
      expect(component.isFileUploadDisabled).toBeTrue();
      expect(component.isJustificationTextDisabled).toBeFalse();

      component.justificationDocuments = [{ id: 8, docFilename: 'attached.pdf' } as any];
      expect(component.isJustificationTextDisabled).toBeTrue();

      component.onRemovePersistedDocument(8);
      expect(component.isJustificationTextDisabled).toBeFalse();
    });

    it('rejects selecting a fourth file over the 3-file cap and rejects files over 10MB', () => {
      component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
      component.justificationDocuments = [
        { id: 1, docFilename: '1.pdf' } as any,
        { id: 2, docFilename: '2.pdf' } as any,
        { id: 3, docFilename: '3.pdf' } as any
      ];
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: component.justificationDocuments });
      getJustificationSubject.complete();
      component.onEdit();

      const overCapFile = new File(['x'], '4.pdf', { type: 'application/pdf' });
      const input = { files: [overCapFile], value: '4.pdf' } as any;
      component.onFileChange({ target: input } as any);
      expect(component.justificationFileError).toBe('A maximum of 3 justification files is allowed per grant.');

      const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
      const bigInput = { files: [bigFile], value: 'big.pdf' } as any;
      component.justificationDocuments = [];
      component.onFileChange({ target: bigInput } as any);
      expect(component.justificationFileError).toBe('The size of the file you are attaching exceeds 10 MBs maximum file limit.');
    });
  });

  // Prompt - Grant Detail Save Refresh (List and Own Display) (2026-08-25): onSave()/
  // saveJustification() must emit `saved` once `this.data` mutation is complete, so the parent
  // (search-lists.component.ts) can redraw its DataTables row. applyFormModelToData() must also
  // resolve+write the Budget Categories NAME (not just CODE) and coerce the R01 flag to a real
  // boolean.
  describe('Save refresh fix (2026-08-25)', () => {
    beforeEach(() => {
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        justificationText: '',
        budgetCategories: 'ESI R37 T4 Board Competing Transition',
        budgetCategoryCode: 'ESIR37T4',
        twoYearAnnualFundingR01Flag: false
      };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      // Populate budgetCategoryOptions the way fetchDropdownOptions() normally does, so the
      // NAME-resolution lookup in applyFormModelToData() has something to match against.
      (component as any).budgetCategoryOptions = [
        { id: 'ESIR37T4', text: 'ESI R37 T4 Board Competing Transition' },
        { id: 'OTHER', text: 'Other Category' }
      ];
    });

    it('emits saved on a successful funding-fields save', () => {
      component.onEdit();
      component.formModel.docDecision = 'Pay';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(savedSpy).toHaveBeenCalledTimes(1);
    });

    it('emits saved on a successful justification-only save', () => {
      component.onEdit();
      component.formModel.justificationText = 'New justification text';
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      // saveJustification()'s success path re-fetches via refreshJustificationData() — return a
      // fresh, already-resolved observable so its next() (and therefore the onComplete callback
      // that emits `saved`) fires synchronously, since the initial getJustificationSubject used
      // for ngOnInit()'s fetch has already completed.
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: 'New justification text' } as any));

      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(savedSpy).toHaveBeenCalledTimes(1);
    });

    it('sends an explicit blank when previously saved justification text is cleared', () => {
      component.data.justificationText = 'Previously saved justification';
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: 'Previously saved justification' });
      getJustificationSubject.complete();
      component.onEdit();
      component.formModel.justificationText = '';
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));
      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm)
        .toHaveBeenCalledWith(1, 100, undefined, '', undefined);
      expect(component.isEditMode).toBeFalse();
      expect(component.data.justificationText).toBe('');
      expect(savedSpy).toHaveBeenCalledTimes(1);
    });

    it('atomically replaces previously saved justification text with a selected file', () => {
      component.data.justificationText = 'Previously saved justification';
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: 'Previously saved justification' });
      getJustificationSubject.complete();
      component.onEdit();
      component.formModel.justificationText = '';
      component.justificationFiles = [new File(['content'], 'justification.pdf', { type: 'application/pdf' })];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({
        justificationText: '',
        documents: [{ id: 99, docFilename: 'justification.pdf' }]
      } as any));
      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm)
        .toHaveBeenCalledWith(1, 100, jasmine.any(File), '', undefined);
      expect(component.isEditMode).toBeFalse();
      expect(component.data.justificationText).toBe('');
      expect(component.justificationDocuments).toEqual([{ id: 99, docFilename: 'justification.pdf' }]);
      expect(savedSpy).toHaveBeenCalledTimes(1);
    });

    it('saves funding fields before clearing justification text in the same save', () => {
      component.data.justificationText = 'Previously saved justification';
      component.justificationLoaded = true;
      component.onEdit();
      component.formModel.justificationText = '';
      component.formModel.docDecision = 'Pay';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({
        justificationText: ''
      } as any));
      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalled();
      expect(fundingSubmissionsServiceSpy.saveJustificationForm)
        .toHaveBeenCalledWith(1, 100, undefined, '', undefined);
      expect((fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.first() as any).invocationOrder)
        .toBeLessThan((fundingSubmissionsServiceSpy.saveJustificationForm.calls.first() as any).invocationOrder);
      expect(savedSpy).toHaveBeenCalledTimes(1);
    });

    it('does not send justification data for a true no-op save', () => {
      component.onEdit();
      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm).not.toHaveBeenCalled();
    });

    it('shows the exact success message after a no-op save', () => {
      component.onEdit();

      component.onSave();

      expect(component.saveSuccessMessage)
        .toBe('Success! You have successfully updated Grant Selection for 1R01CA123456-01');
    });

    it('shows the exact success message after a funding-fields save', () => {
      component.onEdit();
      component.formModel.docDecision = 'Pay';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.saveSuccessMessage)
        .toBe('Success! You have successfully updated Grant Selection for 1R01CA123456-01');
    });

    it('shows the exact success message after a justification save', () => {
      component.onEdit();
      component.formModel.justificationText = 'New justification text';
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({
        justificationText: 'New justification text'
      } as any));

      component.onSave();

      expect(component.saveSuccessMessage)
        .toBe('Success! You have successfully updated Grant Selection for 1R01CA123456-01');
    });

    it('passes undefined text for a file-only upload when text is unchanged', () => {
      component.justificationLoaded = true;
      component.onEdit();
      component.justificationFiles = [new File(['content'], 'justification.pdf', { type: 'application/pdf' })];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm)
        .toHaveBeenCalledWith(1, 100, jasmine.any(File), undefined, undefined);
    });

    it('keeps an existing text value when a file is selected, leaving mutual exclusion to the backend', () => {
      component.data.justificationText = 'Existing text';
      component.justificationLoaded = true;
      component.onEdit();
      component.justificationFiles = [new File(['content'], 'justification.pdf', { type: 'application/pdf' })];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: 'Existing text' } as any));

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm)
        .toHaveBeenCalledWith(1, 100, jasmine.any(File), undefined, undefined);
    });

    it('displays the backend mixed-mode validation message near the justification controls', () => {
      const message = 'Provide either justification text or justification files, not both.';
      component.justificationLoaded = true;
      component.onEdit();
      component.formModel.justificationText = 'Entered text';
      component.justificationFiles = [new File(['content'], 'justification.pdf', { type: 'application/pdf' })];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(throwError(() => ({
        status: 400,
        error: message
      })));

      component.onSave();
      fixture.detectChanges();

      expect(component.justificationSaveError).toBe(message);
      expect(component.isSaveInProgress()).toBeFalse();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim()).toBe(message);
    });

    it('clears a displayed justification save error when the user changes the justification input', () => {
      component.justificationSaveError = 'Previous save error';

      component.onNotesModelChange();

      expect(component.justificationSaveError).toBeNull();
    });

    it('applyFormModelToData() resolves and writes both budgetCategories (NAME) and budgetCategoryCode (CODE)', () => {
      component.onEdit();
      component.formModel.budgetCategories = 'OTHER';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.data.budgetCategoryCode).toBe('OTHER');
      expect(component.data.budgetCategories).toBe('Other Category');
    });

    it('applyFormModelToData() gracefully clears both budget category fields when the selection has no matching option', () => {
      component.onEdit();
      component.formModel.budgetCategories = null;
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      expect(() => component.onSave()).not.toThrow();

      expect(component.data.budgetCategories).toBeNull();
    });

    it('writes twoYearAnnualFundingR01Flag as a real boolean true when "Yes" is selected', () => {
      component.onEdit();
      component.formModel.annualFundingR01 = 'Yes';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.data.twoYearAnnualFundingR01Flag).toBe(true);
    });

    it('writes twoYearAnnualFundingR01Flag as a real boolean false (not a truthy string) when "No" is selected', () => {
      component.data.twoYearAnnualFundingR01Flag = true;
      component.onEdit();
      component.formModel.annualFundingR01 = 'No';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.data.twoYearAnnualFundingR01Flag).toBe(false);
    });

    it('when DOC Decision is Do Not Pay, clears only dependent fields and justification while preserving both note fields in the payload', () => {
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        docDecision: 'Pay',
        docPriority: 3,
        docRecommendedAmount: 45000,
        docRecommendedReductionPct: 25,
        docNciSelection: 'NCI',
        docNciSelectionName: 'National Cancer Institute',
        twoYearAnnualFundingR01Flag: true,
        annualOrMyf: 'MYF',
        annualOrMyfName: 'Multi-Year Funding',
        budgetCategoryCode: 'ESIR37T4',
        budgetCategories: 'ESI R37 T4 Board Competing Transition',
        docNotes: 'keep this note',
        oefiaNotes: 'keep this OEFIA note',
        justificationText: 'remove this justification',
        justificationFileName: 'old.pdf'
      };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: 'remove this justification' });
      getJustificationSubject.complete();

      (component as any).decisionOptions = [
        { id: 'DNP', text: 'Do Not Pay' },
        { id: 'Pay', text: 'Pay' }
      ];
      (component as any).selectionOptions = [{ id: 'NCI', text: 'National Cancer Institute' }];
      (component as any).annualMyfOptions = [{ id: 'MYF', text: 'Multi-Year Funding' }];
      (component as any).budgetCategoryOptions = [
        { id: 'ESIR37T4', text: 'ESI R37 T4 Board Competing Transition' }
      ];

      component.onEdit();
      component.formModel.docDecision = 'DNP';
      component.formModel.docPriority = '99';
      component.formModel.docRecAmt = 99999;
      component.formModel.docRecReductionPct = 10;
      component.formModel.annualFundingR01 = 'Yes';
      component.formModel.annualOrMyf = 'MYF';
      component.formModel.budgetCategories = 'ESIR37T4';
      component.formModel.docNciSelection = 'NCI';
      component.formModel.oefiaNotes = 'attempted OEFIA note change';
      component.formModel.justificationText = 'new justification';
      component.formModel.docNotes = 'keep this note';
      component.justificationFiles = [new File(['x'], 'new.pdf', { type: 'application/pdf' })];

      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));

      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docDecision).toBe('DNP');
      expect(payload.fields.docPriority).toBeNull();
      expect(payload.fields.docRecAmt).toBeNull();
      expect(payload.fields.docRecReductionPct).toBeNull();
      expect(payload.fields.annualFundingR01).toBeNull();
      expect(payload.fields.annualOrMyf).toBeNull();
      expect(payload.fields.budgetCategories).toBeNull();
      expect(payload.fields.docNciSelection).toBeNull();
      expect(payload.fields.oefiaNotes).toBe('keep this OEFIA note');
      expect(payload.fields.docNotes).toBe('keep this note');

      expect(fundingSubmissionsServiceSpy.saveJustificationForm)
        .toHaveBeenCalledWith(1, 100, undefined, '', undefined);
      expect(component.data.docDecision).toBe('DNP');
      expect(component.data.docNotes).toBe('keep this note');
      expect(component.data.docPriority).toBeNull();
      expect(component.data.oefiaNotes).toBe('keep this OEFIA note');
      expect(component.data.docRecommendedAmount).toBeNull();
      expect(component.data.docRecommendedReductionPct).toBeNull();
      expect(component.data.budgetCategories).toBeNull();
      expect(component.data.docNciSelection).toBeNull();
      expect(component.data.docNciSelectionName).toBeNull();
      expect(component.data.annualOrMyf).toBeNull();
      expect(component.data.annualOrMyfName).toBeNull();
      expect(component.data.justificationText).toBe('');
    });
  });

  // Prompt - Display NAME for DOC-NCI Selection and Annual-MYF (2026-08-25): same bug class as
  // Budget Categories, opposite direction — docNciSelection/annualOrMyf (CODE) must keep driving
  // edit-mode dropdown pre-selection and the save payload unchanged, while Grant Detail's own
  // read-only display and applyFormModelToData()'s write-back switch to the new NAME fields
  // (docNciSelectionName/annualOrMyfName), resolved from selectionOptions/annualMyfOptions
  // respectively (NOT docNciOptions/annualMyfOptions from bulk-edit.component.ts, which is a
  // separate, out-of-scope component).
  describe('DOC/NCI Selection & Annual/MYF CODE-vs-NAME fix (2026-08-25)', () => {
    beforeEach(() => {
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        justificationText: '',
        docNciSelection: 'NCI',
        docNciSelectionName: 'National Cancer Institute',
        annualOrMyf: 'MYF',
        annualOrMyfName: 'Multi-Year Funding',
        twoYearAnnualFundingR01Flag: false
      };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();

      // Populate selectionOptions/annualMyfOptions the way fetchDropdownOptions() normally does,
      // so the NAME-resolution lookup in applyFormModelToData() has something to match against.
      (component as any).selectionOptions = [
        { id: 'NCI', text: 'National Cancer Institute' },
        { id: 'DOC', text: 'Division of Extramural Activities' }
      ];
      (component as any).annualMyfOptions = [
        { id: 'MYF', text: 'Multi-Year Funding' },
        { id: 'AF', text: 'Annual Funding' }
      ];
    });

    it('onEdit() seeds formModel.docNciSelection/annualOrMyf from the CODE fields, not the NAME fields (regression check)', () => {
      component.onEdit();

      expect(component.formModel.docNciSelection).toBe('NCI');
      expect(component.formModel.annualOrMyf).toBe('MYF');
    });

    it('onSave() sends CODE-shaped docNciSelection/annualOrMyf values in the bulkUpdateListGrants() payload (regression check)', () => {
      component.onEdit();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      // Simulate saving after only a different field was touched — DOC/NCI Selection and
      // Annual/MYF themselves are left untouched, exactly the "unedited save" scenario the fix
      // protects against: the CODE seeded in onEdit() must still flow through, not a NAME.
      component.formModel.docDecision = 'Pay';

      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docNciSelection).toBe('NCI');
      expect(payload.fields.annualOrMyf).toBe('MYF');
    });

    it('applyFormModelToData() resolves and writes both docNciSelectionName and annualOrMyfName from the selected CODEs', () => {
      component.onEdit();
      component.formModel.docNciSelection = 'DOC';
      component.formModel.annualOrMyf = 'AF';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.data.docNciSelection).toBe('DOC');
      expect(component.data.docNciSelectionName).toBe('Division of Extramural Activities');
      expect(component.data.annualOrMyf).toBe('AF');
      expect(component.data.annualOrMyfName).toBe('Annual Funding');
    });

    it('applyFormModelToData() gracefully falls back to null for both NAME fields when the selected CODE has no matching option', () => {
      component.onEdit();
      component.formModel.docNciSelection = 'UNKNOWN_CODE';
      component.formModel.annualOrMyf = 'UNKNOWN_CODE';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      expect(() => component.onSave()).not.toThrow();

      expect(component.data.docNciSelectionName).toBeNull();
      expect(component.data.annualOrMyfName).toBeNull();
    });

    it('applyFormModelToData() gracefully clears both NAME fields when the selection is cleared (null)', () => {
      component.onEdit();
      component.formModel.docNciSelection = null;
      component.formModel.annualOrMyf = null;
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      expect(() => component.onSave()).not.toThrow();

      expect(component.data.docNciSelectionName).toBeNull();
      expect(component.data.annualOrMyfName).toBeNull();
    });
  });

  describe('FS-2359 staged justification files', () => {
    const createFile = (name: string) => new File(['content'], name, { type: 'application/pdf' });

    beforeEach(() => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: [] });
      getJustificationSubject.complete();
      component.onEdit();
    });

    it('preserves two valid selected files in selection order and renders each unsaved file', () => {
      const first = createFile('first.pdf');
      const second = createFile('second.pdf');
      component.onFileChange({ target: { files: [first], value: 'first.pdf' } } as any);
      component.onFileChange({ target: { files: [second], value: 'second.pdf' } } as any);
      fixture.detectChanges();

      expect(component.justificationFiles).toEqual([first, second]);
      expect(fixture.nativeElement.textContent).toContain('first.pdf');
      expect(fixture.nativeElement.textContent).toContain('second.pdf');
      expect(fixture.nativeElement.querySelectorAll('[title="Remove file"]').length).toBe(2);
    });

    it('removes only the selected staged file and treats every staged file as dirty', () => {
      const first = createFile('first.pdf');
      const second = createFile('second.pdf');
      component.justificationFiles = [first, second];

      component.onRemoveStagedFile(0);

      expect(component.justificationFiles).toEqual([second]);
      expect(component.hasUnsavedChanges()).toBeTrue();
    });

    it('discards all staged files on cancel and counts staged plus visible persisted files for capacity', () => {
      const first = createFile('first.pdf');
      component.justificationDocuments = [{ id: 1, docFilename: 'persisted.pdf' } as any];
      component.justificationFiles = [first, createFile('second.pdf')];

      expect(component.visibleAttachedFileCount).toBe(3);
      expect(component.isFileUploadDisabled).toBeTrue();

      (component as any).discardEditsAndClose();

      expect(component.justificationFiles).toEqual([]);
      expect(component.visiblePersistedDocuments.length).toBe(1);
    });

    it('preserves earlier staged files after an over-cap selection', () => {
      const first = createFile('first.pdf');
      component.justificationDocuments = [
        { id: 1, docFilename: 'persisted-1.pdf' } as any,
        { id: 2, docFilename: 'persisted-2.pdf' } as any
      ];
      component.justificationFiles = [first];

      component.onFileChange({ target: { files: [createFile('over-cap.pdf')], value: 'over-cap.pdf' } } as any);

      expect(component.justificationFiles).toEqual([first]);
      expect(component.justificationFileError).toBe('A maximum of 3 justification files is allowed per grant.');
    });

    it('saves staged files sequentially, putting text and deletions only on the first request', () => {
      const first = createFile('first.pdf');
      const second = createFile('second.pdf');
      component.data.justificationText = 'previously saved';
      component.onEdit();
      component.formModel.justificationText = '';
      component.stagedDeleteDocumentIds = [9];
      component.justificationFiles = [first, second];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValues(
        of({ id: 10, docFilename: 'first.pdf' } as any),
        of({ id: 11, docFilename: 'second.pdf' } as any)
      );
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '', documents: [] } as any));
      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm.calls.allArgs()).toEqual([
        [1, 100, first, '', [9]],
        [1, 100, second, undefined, undefined]
      ]);
      expect(component.justificationFiles).toEqual([]);
      expect(savedSpy).toHaveBeenCalledTimes(1);
    });

    it('keeps failed and unattempted files staged after an explicit rejection and retries only those files', () => {
      const first = createFile('first.pdf');
      const second = createFile('second.pdf');
      const third = createFile('third.pdf');
      component.justificationFiles = [first, second, third];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValues(
        of({ id: 10, docFilename: 'first.pdf' } as any),
        throwError(() => ({ status: 400, error: 'Rejected file' })),
        of({ id: 11, docFilename: 'second.pdf' } as any),
        of({ id: 12, docFilename: 'third.pdf' } as any)
      );
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({
        justificationText: '',
        documents: [{ id: 10, docFilename: 'first.pdf' }]
      } as any));

      component.onSave();

      expect(component.justificationFiles).toEqual([second, third]);
      expect(component.justificationDocuments).toContain(jasmine.objectContaining({ id: 10 }));
      expect(component.isEditMode).toBeTrue();
      expect(component.justificationSaveError).toBe('Rejected file');

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm.calls.allArgs().slice(2)).toEqual([
        [1, 100, second, undefined, undefined],
        [1, 100, third, undefined, undefined]
      ]);
    });

    it('does not repeat an acknowledged funding update when a later upload fails and is retried', () => {
      const first = createFile('first.pdf');
      const second = createFile('second.pdf');
      component.formModel.docDecision = 'Pay';
      component.justificationFiles = [first, second];
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValues(
        of({ id: 10, docFilename: 'first.pdf' } as any),
        throwError(() => ({ status: 400, error: 'Rejected file' })),
        of({ id: 11, docFilename: 'second.pdf' } as any)
      );
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({
        justificationText: '',
        documents: [{ id: 10, docFilename: 'first.pdf' }]
      } as any));

      component.onSave();
      component.onSave();

      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
      expect(fundingSubmissionsServiceSpy.saveJustificationForm.calls.allArgs().slice(2)).toEqual([
        [1, 100, second, undefined, undefined]
      ]);
    });

    it('retains an ambiguously failed upload and locally acknowledged documents when recovery refresh fails', () => {
      const first = createFile('first.pdf');
      const second = createFile('second.pdf');
      component.justificationFiles = [first, second];
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValues(
        of({ id: 10, docFilename: 'first.pdf' } as any),
        throwError(() => ({ status: 0, message: 'Network error' }))
      );
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(throwError(() => new Error('refresh failed')));
      const savedSpy = jasmine.createSpy('saved');
      component.saved.subscribe(savedSpy);

      component.onSave();

      expect(component.justificationDocuments).toContain(jasmine.objectContaining({ id: 10 }));
      expect(component.justificationFiles).toEqual([second]);
      expect(component.isEditMode).toBeTrue();
      expect(savedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Do Not Pay placeholder addedByEmail gate', () => {
    beforeEach(() => {
      component.docFundingListCor = true;
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        docDecision: 'Pay',
        docNotes: '',
        justificationText: '',
        addedByGroup: 'OEFIA'
      };

      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '', documents: [] });
      getJustificationSubject.complete();

      component.decisionOptions = [
        { id: 'Pay', text: 'Pay' },
        { id: 'DNP', text: 'Do Not Pay' }
      ];
    });

    it('requires DOC Notes when Do Not Pay is selected on an OEFIA-added row', () => {
      component.onEdit();
      component.formModel.docDecision = 'DNP';
      component.formModel.docNotes = '   ';

      component.onSave();

      expect(component.saveValidationError).toBe('DOC Notes is required when DOC Decision is Do Not Pay.');
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('does not enforce DOC Notes when row was not added by OEFIA', () => {
      component.data.addedByGroup = 'DOC';
      component.onEdit();
      component.formModel.docDecision = 'DNP';
      component.formModel.docNotes = '   ';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.saveValidationError).toBeNull();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalled();
    });

    it('activates the Do Not Pay lock for DOC-only users on OEFIA-added rows', () => {
      component.OEFIACertifier = false;
      component.onEdit();
      component.formModel.docDecision = 'DNP';

      component.onDocDecisionChange();

      expect(component.doNotPayOefiaLockActive).toBeTrue();
      expect(component.canEditOefiaNotes()).toBeFalse();
    });

    it('does not activate the Do Not Pay lock for OEFIA users on OEFIA-added rows', () => {
      component.OEFIACertifier = true;
      component.onEdit();
      component.formModel.docDecision = 'DNP';

      component.onDocDecisionChange();

      expect(component.doNotPayOefiaLockActive).toBeFalse();
      expect(component.canEditOefiaNotes()).toBeTrue();
    });

    it('preserves edited OEFIA Notes for OEFIA users when Do Not Pay is selected', () => {
      component.OEFIACertifier = true;
      component.data.oefiaNotes = 'original note';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onEdit();
      component.formModel.docDecision = 'DNP';
      component.formModel.oefiaNotes = 'updated by OEFIA';
      component.formModel.docNotes = 'doc note';

      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.oefiaNotes).toBe('updated by OEFIA');
      expect(component.data.oefiaNotes).toBe('updated by OEFIA');
    });
  });
});
