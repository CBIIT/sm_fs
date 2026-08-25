import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';

import { GrantDetailComponent } from './grant-detail.component';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';

describe('GrantDetailComponent', () => {
  let component: GrantDetailComponent;
  let fixture: ComponentFixture<GrantDetailComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsControllerService>;
  let getJustificationSubject: Subject<any>;

  beforeEach(async () => {
    getJustificationSubject = new Subject<any>();

    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsControllerService', [
      'getJustification', 'saveJustificationForm', 'bulkUpdateListGrants'
    ]);
    fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());

    const dropdownLookupServiceSpy = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
      'getDocDecisions', 'getAnnualFundingR01Options', 'getAnnualOrMyfOptions',
      'getBudgetCategories', 'getDocNciSelections'
    ]);
    dropdownLookupServiceSpy.getDocDecisions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualFundingR01Options.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualOrMyfOptions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(of([]));
    dropdownLookupServiceSpy.getDocNciSelections.and.returnValue(of([]));

    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    propertiesServiceSpy.getProperty.and.returnValue('http://grant-viewer/');

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [GrantDetailComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FundingSubmissionsControllerService, useValue: fundingSubmissionsServiceSpy },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
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
  });
});
