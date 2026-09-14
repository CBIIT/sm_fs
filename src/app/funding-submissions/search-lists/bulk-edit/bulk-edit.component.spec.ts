import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, forwardRef, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';

import { BulkEditComponent } from './bulk-edit.component';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { roleNames } from '../../../service/role-names';

@Component({
  selector: 'ng-select2',
  template: '',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FakeNgSelect2Component),
    multi: true
  }]
})
class FakeNgSelect2Component implements ControlValueAccessor {
  @Input() id = '';
  @Input() data: any[] = [];
  @Input() allowClear = false;
  @Input() width = '';

  writeValue(_value: any): void {}
  registerOnChange(_fn: any): void {}
  registerOnTouched(_fn: any): void {}
  setDisabledState(_isDisabled: boolean): void {}
}

// Bulk Edit Budget Categories CODE-vs-NAME Mismatch fix (2026-08-25): the per-row
// `budgetCategories` field on `this.rows` must be seeded from the grant's `budgetCategoryCode`
// (CODE), not the NAME-valued `budgetCategories` the main grid displays — the per-row Select2
// dropdown's options (`budgetCategoryOptions`) are keyed by CODE, so a NAME value never matches
// an option and renders blank. Worse, an unedited row's save sends whatever is in
// `row.budgetCategories` verbatim to `bulkUpdateListGrants()`, and the backend's
// `resolveBudCatId()` does a CODE lookup — a NAME value there silently resolves to `null` and
// wipes `budCatId` on save. These tests document/prevent both symptoms.
describe('BulkEditComponent', () => {
  let component: BulkEditComponent;
  let fixture: ComponentFixture<BulkEditComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsService>;
  let userSessionServiceSpy: jasmine.SpyObj<AppUserSessionService>;

  function grant(overrides: Partial<any> = {}): any {
    return {
      applId: 100,
      grantNumber: '1R01CA123456-01',
      piName: 'Jane Doe',
      piEmail: 'jane.doe@example.com',
      budgetCategories: 'ESI R37 T4 Board Competing Transition',
      budgetCategoryCode: 'ESIR37T4',
      docDecision: 'Pay',
      docNciSelection: 'DOC',
      annualOrMyf: 'MYF',
      docNotes: '',
      oefiaNotes: '',
      docPriority: 1,
      docRecommendedAmount: null,
      docRecommendedReductionPct: null,
      twoYearAnnualFundingR01Flag: false,
      recusedFlag: false,
      ...overrides
    };
  }

  beforeEach(async () => {
    // ngAfterViewInit() touches the global jQuery/DataTables plugin object; not loaded in Karma.
    (window as any).$ = (window as any).$ || { fn: { DataTable: { ext: { pager: {} } } } };

    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', [
      'bulkUpdateListGrants'
    ]);
    userSessionServiceSpy = jasmine.createSpyObj('AppUserSessionService', ['hasRole']);
    userSessionServiceSpy.hasRole.and.returnValue(false);

    const dropdownLookupServiceSpy = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
      'getDocDecisions', 'getDocNciSelections', 'getAnnualFundingR01Options',
      'getAnnualOrMyfOptions', 'getBudgetCategories'
    ]);
    dropdownLookupServiceSpy.getDocDecisions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getDocNciSelections.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualFundingR01Options.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualOrMyfOptions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(of([
      { id: 'ESIR37T4', text: 'ESI R37 T4 Board Competing Transition' }
    ]));

    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    propertiesServiceSpy.getProperty.and.returnValue('http://example/');

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [BulkEditComponent, FakeNgSelect2Component],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy },
        { provide: AppUserSessionService, useValue: userSessionServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BulkEditComponent);
    component = fixture.componentInstance;
  });

  function seedHistoryStateAndInit(grants: any[]): void {
    spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, selectionDate: '', grants });
    component.ngOnInit();
  }

  function setRoles(docFundingListCor: boolean, oefiaCertifier: boolean): void {
    userSessionServiceSpy.hasRole.and.callFake((role: string) => {
      if (role === roleNames.DOC_FUNDING_LIST_COR) {
        return docFundingListCor;
      }
      if (role === roleNames.OEFIA_CERTIFIER) {
        return oefiaCertifier;
      }
      return false;
    });
  }

  it('seeds the per-row budgetCategories field from the grant\'s budgetCategoryCode (CODE), not the NAME-valued budgetCategories', () => {
    seedHistoryStateAndInit([grant()]);

    expect(component.rows[0].budgetCategories).toBe('ESIR37T4');
    expect(component.rows[0].budgetCategories).not.toBe('ESI R37 T4 Board Competing Transition');
  });

  it('falls back to an empty string when a row has no budgetCategoryCode', () => {
    seedHistoryStateAndInit([grant({ budgetCategoryCode: undefined })]);

    expect(component.rows[0].budgetCategories).toBe('');
  });

  it('sends a CODE-shaped budgetCategories value (not the free-text NAME) in a dirty row\'s save payload', () => {
    seedHistoryStateAndInit([grant()]);
    fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

    // FS-2277: onSave() now requires a real dirty row (canSave === true) before it will call
    // bulkUpdateListGrants(); establish that via a genuine field edit + onRowFieldChange(),
    // leaving budgetCategories untouched so this payload assertion still reflects the
    // CODE-vs-NAME fix.
    component.rows[0].docNotes = 'edited note';
    component.onRowFieldChange();
    component.onSave();

    const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
    expect(payload.fields.budgetCategories).toBe('ESIR37T4');
    expect(payload.fields.budgetCategories).not.toBe('ESI R37 T4 Board Competing Transition');
  });

  it('always sends every FundingSubmBulkEditFieldsDto key in the save payload, even when a row has no value for it', () => {
    // Hardcoded expected key list mirrors the generated `FundingSubmBulkEditFieldsDto` interface
    // (node_modules/@cbiit/i2efsws-lib/model/fundingSubmBulkEditFieldsDto.d.ts). Every field on
    // that interface is optional, so TypeScript's structural typing does NOT catch a future field
    // being silently dropped from onSave()'s payload object literal at compile time — an object
    // missing a key is still assignable to a type where every property is optional. This list
    // must be manually kept in sync with the generated DTO until/unless a build-time contract
    // check exists (see the cross-repo DTO/field-list contract enforcement thread).
    const expectedDtoKeys = [
      'budgetCategories', 'docDecision', 'docNciSelection', 'annualFundingR01', 'annualOrMyf',
      'docNotes', 'oefiaNotes', 'docPriority', 'docRecAmt', 'docRecReductionPct', 'recused'
    ];

    seedHistoryStateAndInit([grant()]);
    fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

    // FS-2277: establish a real dirty row before onSave(), since the corrected no-op guard
    // now blocks a clean/untouched save.
    component.rows[0].docNotes = 'edited note';
    component.onRowFieldChange();
    component.onSave();

    const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
    expect(Object.keys(payload.fields).sort()).toEqual(expectedDtoKeys.sort());
  });

  it('goBack() preserves from=lists when navigating back to Search Lists', () => {
    seedHistoryStateAndInit([grant()]);
    component.fromRoute = 'lists';
    component.listId = 42;
    component.selectionDate = 'SEL-42';
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/funding-submissions/search'], {
      queryParams: { listId: 42, selectionDate: 'SEL-42', from: 'lists' }
    });
  });
  describe('FS-2277 — Bulk Edit Save dirty-state derivation', () => {
    it('initializes with selected grants and canSave === false', () => {
      seedHistoryStateAndInit([grant()]);

      expect(component.rows.length).toBe(1);
      expect(component.canSave).toBeFalse();
    });

    it('calling onRowFieldChange() without changing row data keeps canSave === false (covers initial render/binding emissions)', () => {
      seedHistoryStateAndInit([grant()]);

      component.onRowFieldChange();

      expect(component.canSave).toBeFalse();
    });

    it('a real row edit followed by onRowFieldChange() sets canSave === true', () => {
      seedHistoryStateAndInit([grant()]);

      component.rows[0].docNotes = 'a real edit';
      component.onRowFieldChange();

      expect(component.canSave).toBeTrue();
    });

    it('onSave() with canSave === false does not call bulkUpdateListGrants()', () => {
      seedHistoryStateAndInit([grant()]);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('onApplyChanges() with a shared value that changes at least one row sets canSave === true', () => {
      seedHistoryStateAndInit([grant({ docNotes: '' })]);

      component.bulkFields = { docNotes: 'shared note' };
      component.onApplyChanges();

      expect(component.rows[0].docNotes).toBe('shared note');
      expect(component.canSave).toBeTrue();
    });

    it('onApplyChanges() with a shared value equal to every current row value keeps canSave === false', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'shared note' })]);

      component.bulkFields = { docNotes: 'shared note' };
      component.onApplyChanges();

      expect(component.canSave).toBeFalse();
    });

    it('edit-then-revert: restoring a row value to its snapshot disables Save again', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'original note' })]);

      component.rows[0].docNotes = 'changed note';
      component.onRowFieldChange();
      expect(component.canSave).toBeTrue();

      component.rows[0].docNotes = 'original note';
      component.onRowFieldChange();

      expect(component.canSave).toBeFalse();
    });

    it('onReset() clears any displayed save success message', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'original note' })]);

      component.saveSuccessMessage = 'Success! Bulk changes have been applied';
      component.rows[0].docNotes = 'changed note';
      component.onRowFieldChange();

      component.onReset();

      expect(component.saveSuccessMessage).toBe('');
      expect(component.canSave).toBeFalse();
    });

    it('after a successful save, Save disables, lastSavedRows refreshes, and a subsequent no-op onRowFieldChange() keeps Save disabled', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'original note' })]);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.rows[0].docNotes = 'updated note';
      component.onRowFieldChange();
      expect(component.canSave).toBeTrue();

      component.onSave();

      expect(component.canSave).toBeFalse();

      component.onRowFieldChange();

      expect(component.canSave).toBeFalse();
    });

    it('payload preservation: a normal editable-field update still carries through docPriority, docRecAmt, docRecReductionPct, and recused unchanged', () => {
      seedHistoryStateAndInit([grant({
        docPriority: '3',
        docRecommendedAmount: 500000,
        docRecommendedReductionPct: 10,
        recusedFlag: true
      })]);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.rows[0].docNotes = 'edited note';
      component.onRowFieldChange();
      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docPriority).toBe('3');
      expect(payload.fields.docRecAmt).toBe(500000);
      expect(payload.fields.docRecReductionPct).toBe(10);
      expect(payload.fields.recused).toBe('Y');
    });

    it('back-navigation: clean state navigates immediately without opening the unsaved-changes modal', () => {
      seedHistoryStateAndInit([grant()]);
      const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
      const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

      component.onBackToListClick();

      expect(modalService.open).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    });

    it('back-navigation: dirty state opens the unsaved-changes warning modal instead of navigating', () => {
      seedHistoryStateAndInit([grant()]);
      const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
      const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

      component.rows[0].docNotes = 'edited note';
      component.onRowFieldChange();
      component.onBackToListClick();

      expect(modalService.open).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('FS-2108 — DOC Bulk Edit OEFIA Notes read-only behavior', () => {
    it('ngOnInit() reads DOC and OEFIA roles and treats DOC-only users as unable to edit OEFIA Notes', () => {
      setRoles(true, false);

      seedHistoryStateAndInit([grant()]);

      expect(userSessionServiceSpy.hasRole).toHaveBeenCalledWith(roleNames.DOC_FUNDING_LIST_COR);
      expect(userSessionServiceSpy.hasRole).toHaveBeenCalledWith(roleNames.OEFIA_CERTIFIER);
      expect(component.docFundingListCor).toBeTrue();
      expect(component.OEFIACertifier).toBeFalse();
      expect(component.canEditOefiaNotes()).toBeFalse();
    });

    it('does not grant OEFIA Notes edit capability to unexpected non-DOC/non-OEFIA users', () => {
      setRoles(false, false);

      seedHistoryStateAndInit([grant()]);

      expect(component.canEditOefiaNotes()).toBeFalse();
    });

    it('DOC-only: shared OEFIA Notes does not count as an applicable bulk value', () => {
      setRoles(true, false);
      seedHistoryStateAndInit([grant()]);

      component.bulkFields = { oefiaNotes: 'tampered shared OEFIA note' };

      expect(component.hasAnyBulkFieldValue).toBeFalse();
    });

    it('DOC-only: onApplyChanges() ignores tampered shared OEFIA Notes and keeps Save disabled', () => {
      setRoles(true, false);
      seedHistoryStateAndInit([grant({ oefiaNotes: 'original OEFIA note' })]);

      component.bulkFields = { oefiaNotes: 'tampered shared OEFIA note' };
      component.onApplyChanges();

      expect(component.rows[0].oefiaNotes).toBe('original OEFIA note');
      expect(component.canSave).toBeFalse();
    });

    it('DOC-only: direct row OEFIA Notes tampering does not make the row dirty', () => {
      setRoles(true, false);
      seedHistoryStateAndInit([grant({ oefiaNotes: 'original OEFIA note' })]);

      component.rows[0].oefiaNotes = 'tampered row OEFIA note';
      component.onRowFieldChange();

      expect(component.rows[0].oefiaNotes).toBe('original OEFIA note');
      expect(component.canSave).toBeFalse();
    });

    it('DOC-only: saving another legitimate DOC edit preserves the original OEFIA Notes payload value', () => {
      setRoles(true, false);
      seedHistoryStateAndInit([grant({ oefiaNotes: 'original OEFIA note' })]);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.rows[0].oefiaNotes = 'tampered row OEFIA note';
      component.rows[0].docNotes = 'legitimate DOC edit';
      component.onRowFieldChange();
      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docNotes).toBe('legitimate DOC edit');
      expect(payload.fields.oefiaNotes).toBe('original OEFIA note');
    });

    it('DOC-only: multiple-row save preserves each row\'s own original OEFIA Notes payload value', () => {
      setRoles(true, false);
      seedHistoryStateAndInit([
        grant({ applId: 100, oefiaNotes: 'first original OEFIA note' }),
        grant({ applId: 200, oefiaNotes: 'second original OEFIA note' })
      ]);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.rows[0].oefiaNotes = 'first tampered OEFIA note';
      component.rows[1].oefiaNotes = 'second tampered OEFIA note';
      component.rows[0].docNotes = 'legitimate DOC edit';
      component.onRowFieldChange();
      component.onSave();

      const firstPayload = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.argsFor(0)[0];
      const secondPayload = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.argsFor(1)[0];
      expect(firstPayload.fields.oefiaNotes).toBe('first original OEFIA note');
      expect(secondPayload.fields.oefiaNotes).toBe('second original OEFIA note');
    });

    it('OEFIA-capable: shared OEFIA Notes can be applied and enables Save', () => {
      setRoles(false, true);
      seedHistoryStateAndInit([grant({ oefiaNotes: 'original OEFIA note' })]);

      component.bulkFields = { oefiaNotes: 'shared OEFIA note' };
      component.onApplyChanges();

      expect(component.hasAnyBulkFieldValue).toBeTrue();
      expect(component.rows[0].oefiaNotes).toBe('shared OEFIA note');
      expect(component.canSave).toBeTrue();
    });

    it('OEFIA-capable: direct per-row OEFIA Notes edit enables Save and reverting disables Save', () => {
      setRoles(false, true);
      seedHistoryStateAndInit([grant({ oefiaNotes: 'original OEFIA note' })]);

      component.rows[0].oefiaNotes = 'changed OEFIA note';
      component.onRowFieldChange();
      expect(component.canSave).toBeTrue();

      component.rows[0].oefiaNotes = 'original OEFIA note';
      component.onRowFieldChange();

      expect(component.canSave).toBeFalse();
    });

    it('dual-role: OEFIA Notes remains editable and participates in dirty-state calculation', () => {
      setRoles(true, true);
      seedHistoryStateAndInit([grant({ oefiaNotes: 'original OEFIA note' })]);

      expect(component.canEditOefiaNotes()).toBeTrue();

      component.rows[0].oefiaNotes = 'dual-role OEFIA edit';
      component.onRowFieldChange();

      expect(component.canSave).toBeTrue();
    });

    it('DOC-only: shared OEFIA Notes is rendered as an empty read-only textarea', () => {
      setRoles(true, false);
      spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, selectionDate: '', grants: [grant()] });

      fixture.detectChanges();

      const bulkOefiaTextarea = fixture.nativeElement.querySelector('textarea[name="bulkOefiaNotes"]');
      const readOnlyOefiaTextarea = fixture.nativeElement.querySelector('textarea[aria-label="OEFIA Notes"]');
      expect(bulkOefiaTextarea).toBeNull();
      expect(readOnlyOefiaTextarea).not.toBeNull();
      expect(readOnlyOefiaTextarea.readOnly).toBeTrue();
      expect(readOnlyOefiaTextarea.value).toBe('');
      expect(fixture.nativeElement.textContent).not.toContain('View only');
    });

    it('OEFIA-capable: shared OEFIA Notes is rendered as an editable textarea', () => {
      setRoles(false, true);
      spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, selectionDate: '', grants: [grant()] });

      fixture.detectChanges();

      const bulkOefiaTextarea = fixture.nativeElement.querySelector('textarea[name="bulkOefiaNotes"]');
      expect(bulkOefiaTextarea).not.toBeNull();
    });
  });
});
