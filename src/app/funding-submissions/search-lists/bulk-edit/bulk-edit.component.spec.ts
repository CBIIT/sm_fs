import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Component, forwardRef, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbModal, NgbTooltip, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { By } from '@angular/platform-browser';
import { FundingSubmissionBulkEditRequestDto, FundingSubmissionDocPayDefaultsDto, FundingSubmissionListDetailDto, FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
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
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<Omit<FundingSubmissionsService,
    'getDocPayDefaults' | 'getListDetail' | 'bulkUpdateListGrants'> & {
      getDocPayDefaults(listId: number, applIds: number[]): Observable<FundingSubmissionDocPayDefaultsDto[]>;
      getListDetail(listId: number): Observable<FundingSubmissionListDetailDto>;
      bulkUpdateListGrants(body: FundingSubmissionBulkEditRequestDto, listId: number): Observable<number>;
    }>;
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
      twoYearAnnualFundingR01Flag: true,
      recusedFlag: false,
      ...overrides
    };
  }

  beforeEach(async () => {
    // ngAfterViewInit() touches the global jQuery/DataTables plugin object; not loaded in Karma.
    (window as any).$ = (window as any).$ || { fn: { DataTable: { ext: { pager: {} } } } };

    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', [
      'bulkUpdateListGrants', 'getDocPayDefaults', 'getListDetail'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.callFake(() => of({
      grants: component.rows.map(row => {
        const fields = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.allArgs()
          .slice().reverse().find(([request]) => request.applIds.includes(row.applId))[0].fields;
        return {
          ...row,
          docDecision: fields.docDecision,
          docPriority: fields.docPriority == null ? null : Number(fields.docPriority),
          docRecommendedAmount: fields.docRecAmt,
          docRecommendedReductionPct: fields.docRecReductionPct,
          budgetCategoryCode: fields.budgetCategories,
          budgetCategories: component.budgetCategoryOptions.find(option => option.id === fields.budgetCategories)?.text ?? null,
          docNciSelection: fields.docNciSelection,
          annualFundingR01: fields.annualFundingR01,
          twoYearAnnualFundingR01Flag: fields.annualFundingR01 === 'Yes',
          annualOrMyf: fields.annualOrMyf,
          docNotes: fields.docNotes,
          oefiaNotes: fields.oefiaNotes,
          recusedFlag: fields.recused === 'Y'
        };
      })
    }));
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
      imports: [FormsModule, NgbTooltipModule],
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

  function initializeFixtureWithGrants(grants: any[]): void {
    spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, selectionDate: '', grants });
    fixture.detectChanges();
  }

  function getSaveButton(): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Save') as HTMLButtonElement;
  }

  function renderDocNotesCell(row: any): string {
    const view = component.docNotesRenderer.createEmbeddedView({ adtData: row });
    view.detectChanges();
    const text = view.rootNodes.map((node: any) => node.textContent || '').join(' ');
    view.destroy();
    return text;
  }

  describe('FS-2679 per-grant DOC Pay defaults and saved readback', () => {
    let defaultsResponse: Subject<FundingSubmissionDocPayDefaultsDto[]>;
    const defaultRows: FundingSubmissionDocPayDefaultsDto[] = [
      {
        applId: 100, transitionEligible: true, budgetCategories: 'R01R37', budgetCategoriesName: 'R01/R37',
        docNciSelection: 'DOC', annualFundingR01: 'No', annualOrMyf: 'MYF Alloc', annualOrMyfName: 'MYF'
      },
      {
        applId: 200, transitionEligible: true, budgetCategories: 'PARU', budgetCategoriesName: "PAR U's",
        docNciSelection: 'DOC', annualFundingR01: null, annualOrMyf: 'AF Alloc', annualOrMyfName: 'Annual'
      }
    ];

    function doNotPayGrant(applId: number): any {
      return grant({
        applId, addedByGroup: 'OEFIA', docDecision: 'Do Not Pay',
        budgetCategoryCode: null, annualOrMyf: null, annualFundingR01: null,
        docNciSelection: null, docPriority: null, docRecommendedAmount: null,
        docRecommendedReductionPct: null, recusedFlag: false
      });
    }

    function applyPay(): void {
      component.bulkFields = { docDecision: 'Pay' };
      component.onApplyChanges();
    }

    function savedGrants(): FundingSubmissionListGrantDto[] {
      return [
        {
          applId: 100, docDecision: 'Pay', budgetCategoryCode: 'SAVEDR01', budgetCategories: 'Saved R01',
          docNciSelection: 'NCI', docNciSelectionName: 'NCI', annualFundingR01: 'Yes',
          twoYearAnnualFundingR01Flag: true, annualOrMyf: 'AF Alloc', annualOrMyfName: 'Saved Annual',
          recusedFlag: true, docNotes: 'Saved note'
        },
        {
          applId: 200, docDecision: 'Pay', budgetCategoryCode: 'SAVEDU', budgetCategories: 'Saved U',
          docNciSelection: 'DOC', annualFundingR01: 'No', twoYearAnnualFundingR01Flag: false,
          annualOrMyf: 'MYF Alloc', annualOrMyfName: 'Saved MYF', recusedFlag: false, docNotes: 'Other saved note'
        }
      ];
    }

    beforeEach(() => {
      setRoles(true, false);
      initializeFixtureWithGrants([doNotPayGrant(100), doNotPayGrant(200)]);
      defaultsResponse = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(defaultsResponse);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({ grants: savedGrants() }));
    });

    it('resolves each eligible row before required checks and keeps DOC Budget Categories and Annual/MYF hidden', () => {
      applyPay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledWith(1, [100, 200]);
      expect(component.docPayDefaultsLoading).toBeTrue();
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      defaultsResponse.next(defaultRows);
      expect(component.rows[0].budgetCategories).toBe('R01R37');
      expect(component.rows[1].budgetCategories).toBe('PARU');
      expect(component.rows.map(row => row.annualOrMyf)).toEqual(['MYF Alloc', 'AF Alloc']);
      expect(component.rows.map(row => row.annualFundingR01)).toEqual(['No', null]);
      component.ngAfterViewInit();
      const fields = component.dtOptions.columns.map(column => column.data);
      expect(fields).not.toContain('budgetCategories');
      expect(fields).not.toContain('annualOrMyf');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#bulk-budget-cat')).toBeNull();
      expect(fixture.nativeElement.querySelector('#bulk-annual-myf')).toBeNull();
      component.onSave();
      expect(component.hasMandatoryFieldError(component.rows[1], 'annualFundingR01')).toBeTrue();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      component.rows[1].annualFundingR01 = 'No';
      component.onRowFieldChange(component.rows[1], 'annualFundingR01');
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.allArgs().map(([request]) => request.fields))
        .toEqual([
          jasmine.objectContaining({ budgetCategories: 'R01R37', annualOrMyf: 'MYF Alloc', annualFundingR01: 'No' }),
          jasmine.objectContaining({ budgetCategories: 'PARU', annualOrMyf: 'AF Alloc', annualFundingR01: 'No' })
        ]);
    });

    it('resolves a direct per-row transition without applying defaults to a still-Do-Not-Pay row', () => {
      component.rows[0].docDecision = 'Pay';
      component.onRowDocDecisionChange(component.rows[0]);
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledWith(1, [100]);
      defaultsResponse.next([defaultRows[0]]);
      expect(component.rows[0].budgetCategories).toBe('R01R37');
      expect(component.rows[1].budgetCategories).toBe('');
      expect(component.rows[1].docDecision).toBe('Do Not Pay');
    });

    it('does not reuse defaults from an eligible row for an unrelated persisted Pay row in a mixed selection', () => {
      const existing = grant({ applId: 300, budgetCategoryCode: 'EXISTING', annualOrMyf: 'EXISTING' });
      component.rows.push({ ...existing, budgetCategories: 'EXISTING', annualFundingR01: 'Yes' });
      (component as any).lastSavedRows.push({ ...component.rows[2] });
      applyPay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledWith(1, [100, 200]);
      defaultsResponse.next(defaultRows);
      expect(component.rows[2].budgetCategories).toBe('EXISTING');
      expect(component.rows[2].annualOrMyf).toBe('EXISTING');
    });

    for (const annualFundingR01 of ['Yes', 'No']) {
      it(`preserves explicit bulk selections including NCI and 2Y ${annualFundingR01}`, () => {
        component.bulkFields = {
          docDecision: 'Pay', budgetCategories: 'EXPLICIT', docNciSelection: 'NCI',
          annualFundingR01, annualOrMyf: 'AF Alloc'
        };
        component.onApplyChanges();
        defaultsResponse.next(defaultRows);
        for (const row of component.rows) {
          expect(row.budgetCategories).toBe('EXPLICIT');
          expect(row.docNciSelection).toBe('NCI');
          expect(row.annualFundingR01).toBe(annualFundingR01);
          expect(row.annualOrMyf).toBe('AF Alloc');
        }
      });
    }

    it('does not overwrite newer per-row selections or explicitly cleared values with delayed defaults', () => {
      applyPay();
      const row = component.rows[0];
      row.docNciSelection = 'NCI';
      component.onRowFieldChange(row, 'docNciSelection');
      row.annualFundingR01 = 'Yes';
      component.onRowFieldChange(row, 'annualFundingR01');
      row.annualFundingR01 = null;
      component.onRowFieldChange(row, 'annualFundingR01');
      defaultsResponse.next(defaultRows);
      expect(row.docNciSelection).toBe('NCI');
      expect(row.annualFundingR01).toBeNull();
    });

    it('does not mistake unchanged DataTables binding emissions for newer selections', () => {
      applyPay();
      const row = component.rows[0];
      component.onRowFieldChange(row, 'docNciSelection');
      component.onRowFieldChange(row, 'annualFundingR01');
      defaultsResponse.next(defaultRows);
      expect(row.docNciSelection).toBe('DOC');
      expect(row.annualFundingR01).toBe('No');
    });

    it('also resolves defaults before direct Save when a row decision handler was bypassed', () => {
      component.rows[0].docDecision = 'Pay';
      component.rows[0].annualFundingR01 = 'Yes';
      component.rows[1].docNotes = 'Required Do Not Pay note';
      component.onRowFieldChange();
      component.onSave();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledWith(1, [100]);
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      defaultsResponse.next([defaultRows[0]]);
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
    });

    for (const change of ['decision', 'Reset', 'different list', 'destroy']) {
      it(`ignores defaults delayed past ${change}`, () => {
        applyPay();
        const row = component.rows[0];
        if (change === 'decision') {
          component.bulkFields.docDecision = 'Do Not Pay';
          component.onApplyChanges();
        }
        if (change === 'Reset') component.onReset();
        if (change === 'different list') component.listId = 2;
        if (change === 'destroy') component.ngOnDestroy();
        defaultsResponse.next(defaultRows);
        expect(row.budgetCategories).not.toBe('R01R37');
        expect(component.rows[0].budgetCategories).not.toBe('R01R37');
      });
    }

    it('ignores an older response when a newer shared Pay selection is applied', () => {
      applyPay();
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(of([
        { ...defaultRows[0], budgetCategories: 'NEW' }, defaultRows[1]
      ]));
      component.bulkFields = { docDecision: 'Pay', docNciSelection: 'NCI' };
      component.onApplyChanges();
      defaultsResponse.next(defaultRows);
      expect(component.rows[0].budgetCategories).toBe('NEW');
      expect(component.rows[0].docNciSelection).toBe('NCI');
    });

    it('leaves all rows unchanged when any required default lookup is unresolved', () => {
      applyPay();
      defaultsResponse.next([defaultRows[0], { ...defaultRows[1], annualOrMyf: null }]);
      expect(component.docPayDefaultsError).toBeTruthy();
      expect(component.rows[0].budgetCategories).toBe('');
      expect(component.rows[1].budgetCategories).toBe('');
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('preserves dirty edits after a defaults error and retries only defaults before saving', () => {
      applyPay();
      component.rows[0].docNotes = 'New note';
      defaultsResponse.error(new Error('Defaults unavailable'));
      expect(component.docPayDefaultsError).toBe('Defaults unavailable');
      expect(component.canSave).toBeTrue();
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(of(defaultRows));
      component.loadDocPayDefaults();
      expect(component.docPayDefaultsError).toBe('');
      expect(component.rows[0].docNotes).toBe('New note');
      expect(component.rows[0].budgetCategories).toBe('R01R37');
    });

    it('applies the DOC rule to dual-role callers but not OEFIA-only callers', () => {
      component.OEFIACertifier = true;
      applyPay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledTimes(1);
      defaultsResponse.next(defaultRows);
      component.onReset();
      component.docFundingListCor = false;
      applyPay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledTimes(1);
    });

    it('does not restore FS-2664-cleared priority, recommendations or recused during preview', () => {
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'Required' };
      component.onApplyChanges();
      applyPay();
      defaultsResponse.next(defaultRows);
      expect(component.rows[0]).toEqual(jasmine.objectContaining({
        docPriority: null, docRecAmt: null, docRecReductionPct: null, recused: null
      }));
    });

    it('keeps one write per row and reads actual saved codes, names and flags into rows and Reset baseline', () => {
      const response = new Subject<{ grants: FundingSubmissionListGrantDto[] }>();
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(response);
      component.bulkFields = { docDecision: 'Pay', annualFundingR01: 'No' };
      component.onApplyChanges();
      defaultsResponse.next(defaultRows);
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
      expect(fundingSubmissionsServiceSpy.getListDetail).toHaveBeenCalledWith(1);
      expect(component.rows[0].budgetCategories).toBe('R01R37');
      expect(component.isSaving).toBeTrue();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.first().args[0].fields.recused).toBe('N');
      response.next({ grants: savedGrants() });
      expect(component.rows.map(row => row.budgetCategories)).toEqual(['SAVEDR01', 'SAVEDU']);
      expect(component.rows.map(row => row.annualOrMyfName)).toEqual(['Saved Annual', 'Saved MYF']);
      expect(component.rows.map(row => row.annualFundingR01)).toEqual(['Yes', 'No']);
      expect(component.rows.map(row => row.recusedFlag)).toEqual([true, false]);
      expect(component.canSave).toBeFalse();
      component.rows[0].docNciSelection = 'UNSAVED';
      component.onRowFieldChange();
      component.onReset();
      expect(component.rows[0].docNciSelection).toBe('NCI');
      expect(component.rows[0].budgetCategories).toBe('SAVEDR01');
      expect(component.canSave).toBeFalse();
    });

    it('preserves newer row edits during write and refresh without marking them saved', () => {
      const write = new Subject<number>();
      const response = new Subject<{ grants: FundingSubmissionListGrantDto[] }>();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(write);
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(response);
      component.bulkFields = { docDecision: 'Pay', annualFundingR01: 'No' };
      component.onApplyChanges();
      defaultsResponse.next(defaultRows);
      component.onSave();
      component.rows[0].docNotes = 'Edited during write';
      write.next(1);
      write.complete();
      component.rows[1].docNciSelection = 'NEWER';
      component.onRowFieldChange(component.rows[1], 'docNciSelection');
      response.next({ grants: savedGrants() });
      expect(component.rows[0].docNotes).toBe('Edited during write');
      expect(component.rows[1].docNciSelection).toBe('NEWER');
      expect(component.rows[0].budgetCategories).toBe('SAVEDR01');
      expect(component.canSave).toBeTrue();
      expect(component.saveSuccessMessage).toContain('Your newer edits have not been saved.');
      component.onReset();
      expect(component.rows[0].docNotes).toBe('Saved note');
      expect(component.rows[1].docNciSelection).toBe('DOC');
    });

    for (const failure of ['read error', 'missing saved row']) {
      it(`distinguishes a persisted bulk save from ${failure} and never retries the writes`, () => {
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(failure === 'read error'
          ? throwError(() => new Error('Read unavailable')) : of({ grants: [savedGrants()[0]] }));
        component.bulkFields = { docDecision: 'Pay', annualFundingR01: 'No' };
        component.onApplyChanges();
        defaultsResponse.next(defaultRows);
        component.onSave();
        expect(component.saveErrorMessage).toContain('Bulk changes were saved');
        expect(component.savedChangesNeedRefresh).toBeTrue();
        component.onSave();
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({ grants: savedGrants() }));
        component.refreshSavedFunding();
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
        expect(component.saveErrorMessage).toBe('');
        expect(component.savedChangesNeedRefresh).toBeFalse();
        expect(component.rows[0].budgetCategories).toBe('SAVEDR01');
      });
    }

    for (const change of ['different list', 'destroy']) {
      it(`ignores saved readback after ${change}`, () => {
        const response = new Subject<{ grants: FundingSubmissionListGrantDto[] }>();
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(response);
        component.bulkFields = { docDecision: 'Pay', annualFundingR01: 'No' };
        component.onApplyChanges();
        defaultsResponse.next(defaultRows);
        component.onSave();
        if (change === 'different list') component.listId = 2;
        if (change === 'destroy') component.ngOnDestroy();
        response.next({ grants: savedGrants() });
        expect(component.rows[0].budgetCategories).toBe('R01R37');
      });
    }

    it('ignores a delayed write completion after Reset instead of marking the reset rows saved', () => {
      const write = new Subject<number>();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(write);
      component.bulkFields = { docDecision: 'Pay', annualFundingR01: 'No' };
      component.onApplyChanges();
      defaultsResponse.next(defaultRows);
      component.onSave();
      component.onReset();
      write.next(1);
      write.complete();
      expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
      expect(component.rows[0].docDecision).toBe('Do Not Pay');
      expect(component.saveSuccessMessage).toBe('');
    });
  });

  for (const isDocUser of [true, false]) {
    it(`${isDocUser ? 'hides' : 'retains'} Budget Categories and Annual or MYF table columns for ${isDocUser ? 'DOC' : 'non-DOC'} users`, () => {
      setRoles(isDocUser, !isDocUser);
      seedHistoryStateAndInit([grant()]);
      component.ngAfterViewInit();

      const fields = (component.dtOptions.columns as any[]).map(column => column.data);
      expect(fields.includes('budgetCategories')).toBe(!isDocUser);
      expect(fields.includes('annualOrMyf')).toBe(!isDocUser);
      expect(fields).toContain('docDecision');
      expect(fields).toContain('annualFundingR01');
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

  it('hydrates persisted No and preserves explicit legacy null without defaulting false to No', () => {
    seedHistoryStateAndInit([
      grant({ annualFundingR01: 'No', twoYearAnnualFundingR01Flag: false }),
      grant({ applId: 200, annualFundingR01: null, twoYearAnnualFundingR01Flag: false }),
      grant({ applId: 300, annualFundingR01: undefined, twoYearAnnualFundingR01Flag: false })
    ]);

    expect(component.rows.map(row => row.annualFundingR01)).toEqual(['No', null, null]);
  });

  it('sends an unchanged persisted No in the bulk edit save payload', () => {
    seedHistoryStateAndInit([grant({ annualFundingR01: 'No', twoYearAnnualFundingR01Flag: false })]);
    fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

    component.rows[0].docNotes = 'edited note';
    component.onRowFieldChange();
    component.onSave();

    const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
    expect(payload.fields.annualFundingR01).toBe('No');
  });

  it('preserves explicit legacy null but blocks Pay save until the required annual R01 value is supplied', () => {
    seedHistoryStateAndInit([grant({ annualFundingR01: null, twoYearAnnualFundingR01Flag: false })]);
    fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

    component.rows[0].docNotes = 'edited note';
    component.onRowFieldChange();
    component.onSave();

    expect(component.rows[0].annualFundingR01).toBeNull();
    expect(component.rows[0].docNotes).toBe('edited note');
    expect(component.hasMandatoryFieldError(component.rows[0], 'annualFundingR01')).toBeTrue();
    expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();

    component.rows[0].annualFundingR01 = 'No';
    component.onRowFieldChange();
    component.onSave();

    const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
    expect(payload.fields.annualFundingR01).toBe('No');
    expect(component.hasMandatoryFieldError(component.rows[0], 'annualFundingR01')).toBeFalse();
  });

  it('still rejects clearing a previously persisted annual R01 value', () => {
    seedHistoryStateAndInit([grant({ annualFundingR01: 'No', twoYearAnnualFundingR01Flag: false })]);
    fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

    component.rows[0].annualFundingR01 = null;
    component.onRowFieldChange();
    component.onSave();

    expect(component.hasMandatoryFieldError(component.rows[0], 'annualFundingR01')).toBeTrue();
    expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
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

  it('goBack() preserves from=lists and selected IDs when navigating back to Search Lists', () => {
    seedHistoryStateAndInit([grant(), grant({ applId: 200 })]);
    component.fromRoute = 'lists';
    component.listId = 42;
    component.selectionDate = 'SEL-42';
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    component.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/funding-submissions/search'], {
      queryParams: { listId: 42, selectionDate: 'SEL-42', from: 'lists' },
      state: { selectionListId: 42, selectedApplIds: [100, 200] }
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

  describe('Req. 35 AC6 (FS-2356) and AC7 (FS-2357) — Save validation', () => {
    it('applies a partial shared-field edit and validates the resulting row only when Save is selected', () => {
      seedHistoryStateAndInit([grant({ twoYearAnnualFundingR01Flag: false })]);
      component.bulkFields = { docNotes: 'partial shared edit' };
      component.onBulkFieldChange();

      component.onApplyChanges();

      expect(component.rows[0].docNotes).toBe('partial shared edit');
      expect(component.canSave).toBeTrue();
      expect(component.hasMandatoryFieldError(component.rows[0], 'annualFundingR01')).toBeFalse();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();

      component.onSave();

      expect(component.hasMandatoryFieldError(component.rows[0], 'annualFundingR01')).toBeTrue();
      expect(component.getMandatoryFieldErrorMessage('Two-Year Annual Funding R01 (HRHR)'))
        .toBe('Two-Year Annual Funding R01 (HRHR) is required');
      expect(component.canSave).toBeTrue();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    [
      { key: 'budgetCategories', label: 'Budget Categories', makeBlank: (row: any) => row.budgetCategories = '  ' },
      { key: 'docDecision', label: 'DOC Decision', makeBlank: (row: any) => row.docDecision = '\t' },
      { key: 'docNciSelection', label: 'DOC/NCI Selection', makeBlank: (row: any) => row.docNciSelection = ' ' },
      {
        key: 'annualFundingR01',
        label: 'Two-Year Annual Funding R01 (HRHR)',
        makeBlank: (row: any) => row.annualFundingR01 = null
      },
      { key: 'annualOrMyf', label: 'Annual or MYF', makeBlank: (row: any) => row.annualOrMyf = '  ' }
    ].forEach(({ key, label, makeBlank }) => {
      it(`blocks Save with the exact row error when ${label} is blank`, () => {
        seedHistoryStateAndInit([grant()]);
        makeBlank(component.rows[0]);
        component.rows[0].docNotes = 'unsaved edit';
        component.onRowFieldChange();

        component.onSave();

        expect(component.hasMandatoryFieldError(component.rows[0], key)).toBeTrue();
        expect(component.getMandatoryFieldErrorMessage(label)).toBe(`${label} is required`);
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
        expect(component.rows[0].docNotes).toBe('unsaved edit');
        expect(component.canSave).toBeTrue();
      });
    });

    it('shows all missing field errors for their own grant rows and keeps valid rows error-free', () => {
      seedHistoryStateAndInit([grant({ applId: 100 }), grant({ applId: 200 })]);
      component.rows[0].budgetCategories = '';
      component.rows[1].docNciSelection = ' ';
      component.rows[0].docNotes = 'changed first row';
      component.onRowFieldChange();

      component.onSave();

      expect(component.hasMandatoryFieldError(component.rows[0], 'budgetCategories')).toBeTrue();
      expect(component.hasMandatoryFieldError(component.rows[1], 'docNciSelection')).toBeTrue();
      expect(component.hasMandatoryFieldError(component.rows[0], 'docNciSelection')).toBeFalse();
      expect(component.hasMandatoryFieldError(component.rows[1], 'budgetCategories')).toBeFalse();
      expect(component.getMandatoryFieldErrorMessage('Budget Categories')).toBe('Budget Categories is required');
      expect(component.getMandatoryFieldErrorMessage('DOC/NCI Selection')).toBe('DOC/NCI Selection is required');
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('reports every missing AC6 field together on the affected row', () => {
      seedHistoryStateAndInit([grant({ twoYearAnnualFundingR01Flag: false })]);
      const row = component.rows[0];
      row.budgetCategories = '';
      row.docDecision = null;
      row.docNciSelection = ' ';
      row.annualOrMyf = '';
      row.docNotes = 'unsaved edit';
      component.onRowFieldChange();

      component.onSave();

      [
        ['budgetCategories', 'Budget Categories'],
        ['docDecision', 'DOC Decision'],
        ['docNciSelection', 'DOC/NCI Selection'],
        ['annualFundingR01', 'Two-Year Annual Funding R01 (HRHR)'],
        ['annualOrMyf', 'Annual or MYF']
      ].forEach(([field, label]) => {
        expect(component.hasMandatoryFieldError(row, field)).toBeTrue();
        expect(component.getMandatoryFieldErrorMessage(label)).toBe(`${label} is required`);
      });
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('retains invalid values and clears each error only after its row value is corrected', () => {
      seedHistoryStateAndInit([grant()]);
      component.rows[0].annualOrMyf = ' ';
      component.rows[0].docNotes = 'unsaved edit';
      component.onRowFieldChange();
      component.onSave();
      expect(component.hasMandatoryFieldError(component.rows[0], 'annualOrMyf')).toBeTrue();

      component.rows[0].annualOrMyf = 'Annual';
      component.onRowFieldChange();

      expect(component.hasMandatoryFieldError(component.rows[0], 'annualOrMyf')).toBeFalse();
      expect(component.rows[0].docNotes).toBe('unsaved edit');
    });

    it('requires nonblank DOC Notes for Do Not Pay and saves only the decision, note, and cleared dependent fields', () => {
      seedHistoryStateAndInit([grant({
        budgetCategoryCode: 'ESIR37T4',
        docDecision: 'Pay',
        docNciSelection: 'DOC',
        twoYearAnnualFundingR01Flag: true,
        annualOrMyf: 'MYF',
        docNotes: '   ',
        oefiaNotes: 'Existing OEFIA notes',
        recusedFlag: true,
        docPriority: 3,
        docRecommendedAmount: 90000,
        docRecommendedReductionPct: 10
      })]);
      const row = component.rows[0];
      row.docDecision = 'Do Not Pay';
      component.onRowDocDecisionChange(row);

      expect(component.isDoNotPayDecisionSelected(row.docDecision)).toBeTrue();
      expect(row.budgetCategories).toBeNull();
      expect(row.docNciSelection).toBeNull();
      expect(row.annualFundingR01).toBeNull();
      expect(row.annualOrMyf).toBeNull();
      expect(component.canSave).toBeTrue();
      expect(component.hasDoNotPayDocNotesError(row)).toBeTrue();

      expect(row.docPriority).toBeNull();
      expect(row.docRecAmt).toBeNull();
      expect(row.docRecReductionPct).toBeNull();
      expect(row.recused).toBeNull();
      row.recused = 'Y';
      row.docPriority = 3;
      row.docRecAmt = 90000;
      row.docRecReductionPct = 10;
      row.budgetCategories = 'STALE';
      row.docNciSelection = 'STALE';
      row.annualFundingR01 = 'STALE';
      row.annualOrMyf = 'STALE';
      component.onSave();

      expect(component.hasDoNotPayDocNotesError(row)).toBeTrue();
      expect(row.recused).toBeNull();
      expect(row.budgetCategories).toBeNull();
      expect(row.docNciSelection).toBeNull();
      expect(row.annualFundingR01).toBeNull();
      expect(row.annualOrMyf).toBeNull();
      expect(component.getDoNotPayDocNotesErrorMessage())
        .toBe('DOC Notes is required when DOC decision is Do Not Pay.');
      expect(component.hasMandatoryFieldError(row, 'budgetCategories')).toBeFalse();
      expect(component.hasMandatoryFieldError(row, 'docNciSelection')).toBeFalse();
      expect(component.hasMandatoryFieldError(row, 'annualFundingR01')).toBeFalse();
      expect(component.hasMandatoryFieldError(row, 'annualOrMyf')).toBeFalse();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();

      row.docNotes = 'Do Not Pay justification';
      row.recused = 'Y';
      component.onRowFieldChange();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));
      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docDecision).toBe('Do Not Pay');
      expect(payload.fields.docNotes).toBe('Do Not Pay justification');
      expect(payload.fields.budgetCategories).toBeNull();
      expect(payload.fields.docNciSelection).toBeNull();
      expect(payload.fields.annualFundingR01).toBeNull();
      expect(payload.fields.annualOrMyf).toBeNull();
      expect(payload.fields.docPriority).toBeNull();
      expect(payload.fields.docRecAmt).toBeNull();
      expect(payload.fields.docRecReductionPct).toBeNull();
      expect(payload.fields.recused).toBeNull();
      expect(payload.fields.oefiaNotes).toBe('Existing OEFIA notes');
    });

    it('shows bulk and per-row Do Not Pay notes errors before Save for OEFIA bulk edits', () => {
      setRoles(false, true);
      initializeFixtureWithGrants([grant({ applId: 100 }), grant({ applId: 200 })]);
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: '   ' };

      component.onApplyChanges();
      fixture.detectChanges();

      const message = 'DOC Notes is required when DOC decision is Do Not Pay.';
      expect(component.rows.every(row => component.hasDoNotPayDocNotesError(row))).toBeTrue();
      expect(component.showBulkDoNotPayDocNotesError).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain(message);
      expect(renderDocNotesCell(component.rows[0])).toContain(message);
      expect(renderDocNotesCell(component.rows[1])).toContain(message);
      expect(getSaveButton().disabled).toBeTrue();
      expect(component.showApplyBeforeSaveTooltip).toBeTrue();

      const tooltipDebugElement = fixture.debugElement.queryAll(By.directive(NgbTooltip))
        .find(element => element.injector.get(NgbTooltip).ngbTooltip === 'Apply changes prior to saving');
      expect(tooltipDebugElement).toBeDefined();
      expect(tooltipDebugElement!.injector.get(NgbTooltip).disableTooltip).toBeFalse();
      expect((tooltipDebugElement!.nativeElement as HTMLElement).tabIndex).toBe(0);
    });

    it('shows a row-only error and disables Save for an individual Do Not Pay decision', () => {
      initializeFixtureWithGrants([grant()]);
      const row = component.rows[0];
      row.docDecision = 'Do Not Pay';

      component.onRowDocDecisionChange(row);
      fixture.detectChanges();

      expect(component.hasDoNotPayDocNotesError(row)).toBeTrue();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
      expect(renderDocNotesCell(row)).toContain(component.getDoNotPayDocNotesErrorMessage());
      expect(getSaveButton().disabled).toBeTrue();
      expect(component.showApplyBeforeSaveTooltip).toBeTrue();
    });

    it('clears row and bulk errors and enables Save after every affected row gets notes', () => {
      setRoles(false, true);
      initializeFixtureWithGrants([grant({ applId: 100 }), grant({ applId: 200 })]);
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: '' };
      component.onApplyChanges();
      fixture.detectChanges();

      component.rows.forEach((row, index) => {
        row.docNotes = `Justification ${index + 1}`;
      });
      component.onRowFieldChange();
      fixture.detectChanges();

      expect(component.hasDoNotPayDocNotesErrors).toBeFalse();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
      expect(component.rows.every(row => !component.hasDoNotPayDocNotesError(row))).toBeTrue();
      expect(getSaveButton().disabled).toBeFalse();
      expect(component.canSave).toBeTrue();
    });

    it('does not show Do Not Pay notes errors when bulk DOC Notes is nonblank', () => {
      setRoles(false, true);
      initializeFixtureWithGrants([grant()]);
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'Bulk justification' };

      component.onApplyChanges();
      fixture.detectChanges();

      expect(component.hasDoNotPayDocNotesErrors).toBeFalse();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
      expect(component.rows[0].docNotes).toBe('Bulk justification');
      expect(getSaveButton().disabled).toBeFalse();
    });

    it('only shows errors for OEFIA-added rows after DOC-only mixed-source confirmation', () => {
      setRoles(true, false);
      initializeFixtureWithGrants([
        grant({ applId: 100, addedByGroup: 'DOC' }),
        grant({ applId: 200, addedByGroup: 'OEFIA' })
      ]);
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: '' };

      component.onApplyChanges();
      component.onProceedDoNotPayWarning();
      fixture.detectChanges();

      expect(component.hasDoNotPayDocNotesError(component.rows[0])).toBeFalse();
      expect(component.hasDoNotPayDocNotesError(component.rows[1])).toBeTrue();
      expect(renderDocNotesCell(component.rows[0])).not.toContain(component.getDoNotPayDocNotesErrorMessage());
      expect(renderDocNotesCell(component.rows[1])).toContain(component.getDoNotPayDocNotesErrorMessage());
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
      expect(getSaveButton().disabled).toBeTrue();
    });

    it('clears the bulk message on nonblank notes, decision change, and Reset but not OEFIA Notes edits', () => {
      setRoles(false, true);
      initializeFixtureWithGrants([grant()]);
      const applyBlankDoNotPay = () => {
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: '' };
        component.onApplyChanges();
        fixture.detectChanges();
        expect(component.showBulkDoNotPayDocNotesError).toBeTrue();
      };

      applyBlankDoNotPay();
      component.bulkFields.oefiaNotes = 'OEFIA update';
      component.onBulkFieldChange();
      expect(component.showBulkDoNotPayDocNotesError).toBeTrue();

      component.bulkFields.docNotes = 'Entered notes';
      component.onBulkFieldChange();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();

      applyBlankDoNotPay();
      component.bulkFields.docDecision = 'Pay';
      component.onBulkDocDecisionChange();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();

      applyBlankDoNotPay();
      component.onReset();
      expect(component.hasDoNotPayDocNotesErrors).toBeFalse();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
    });

    it('clears the bulk-message state after a successful save', () => {
      setRoles(false, true);
      initializeFixtureWithGrants([grant()]);
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: '' };
      component.onApplyChanges();
      component.rows[0].docNotes = 'Justification';
      component.onRowFieldChange();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
      component.rows[0].docNotes = '';
      component.onRowFieldChange();
      expect(component.hasDoNotPayDocNotesErrors).toBeTrue();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
    });

    it('shows row errors but no bulk message for DOC-only users', () => {
      setRoles(true, false);
      initializeFixtureWithGrants([grant()]);
      component.bulkFields = { docDecision: 'Do Not Pay', docNotes: '' };

      component.onApplyChanges();
      fixture.detectChanges();

      expect(component.hasDoNotPayDocNotesError(component.rows[0])).toBeTrue();
      expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
      expect(renderDocNotesCell(component.rows[0])).toContain(component.getDoNotPayDocNotesErrorMessage());
      expect(getSaveButton().disabled).toBeTrue();
    });

    it('preserves Do Not Pay option origin gating and mixed-source warning before applying', () => {
      setRoles(true, false);
      seedHistoryStateAndInit([
        grant({ applId: 100, addedByGroup: 'DOC' }),
        grant({ applId: 200, addedByGroup: 'OEFIA' })
      ]);
      component.decisionOptions = [{ id: 'DNP', text: 'Do Not Pay' }];
      const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
      modalService.open.and.returnValue({ close: jasmine.createSpy('close') } as any);

      expect(component.getDocDecisionOptionsForRow(component.rows[0])[0].disabled).toBeTrue();
      component.bulkFields = { docDecision: 'Do Not Pay' };
      component.onApplyChanges();

      expect(modalService.open).toHaveBeenCalled();
      expect(component.rows[0].docDecision).toBe('Pay');
      expect(component.rows[1].docDecision).toBe('Pay');

      component.onProceedDoNotPayWarning();

      expect(component.rows[0].docDecision).toBe('Pay');
      expect(component.rows[1].docDecision).toBe('Do Not Pay');
      expect(component.rows[1].budgetCategories).toBeNull();
      expect(component.rows[1].docNciSelection).toBeNull();
    });

    describe('FS-2120 — mixed-origin Do Not Pay DOC Notes', () => {
      function mixedOriginRows(docOverrides: Partial<any> = {}, oefiaOverrides: Partial<any> = {}): any[] {
        return [
          grant({ applId: 100, addedByGroup: 'DOC', ...docOverrides }),
          grant({ applId: 200, addedByGroup: 'OEFIA', ...oefiaOverrides })
        ];
      }

      function applyAndProceedDoNotPay(notes: string): void {
        const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
        modalService.open.and.returnValue({
          close: jasmine.createSpy('close'),
          dismiss: jasmine.createSpy('dismiss')
        } as any);
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: notes };

        component.onApplyChanges();
        expect(modalService.open).toHaveBeenCalled();

        component.onProceedDoNotPayWarning();
      }

      it('applies shared notes only to the eligible row and saves each row with its current note', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(mixedOriginRows(
          { docNotes: 'saved DOC note' },
          { docNotes: 'saved OEFIA note' }
        ));
        component.rows[0].docNotes = 'unsaved DOC note';
        component.onRowFieldChange();

        applyAndProceedDoNotPay('shared DOC note');

        expect(component.rows[0].docDecision).toBe('Pay');
        expect(component.rows[0].docNotes).toBe('unsaved DOC note');
        expect(component.rows[1].docDecision).toBe('Do Not Pay');
        expect(component.rows[1].docNotes).toBe('shared DOC note');
        expect(component.canSave).toBeTrue();

        fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
        component.onSave();

        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
        const requests = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.allArgs()
          .map(([request]) => ({ applId: request.applIds[0], fields: request.fields }));
        expect(requests).toEqual([
          jasmine.objectContaining({
            applId: 100,
            fields: jasmine.objectContaining({ docDecision: 'Pay', docNotes: 'unsaved DOC note' })
          }),
          jasmine.objectContaining({
            applId: 200,
            fields: jasmine.objectContaining({ docDecision: 'Do Not Pay', docNotes: 'shared DOC note' })
          })
        ]);
      });

      it('uses this action’s eligibility when both rows already have Do Not Pay', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(mixedOriginRows(
          { docDecision: 'Do Not Pay', docNotes: 'DOC-owned note' },
          { docDecision: 'Do Not Pay', docNotes: 'prior OEFIA note' }
        ));

        applyAndProceedDoNotPay('new shared note');

        expect(component.rows[0].docDecision).toBe('Do Not Pay');
        expect(component.rows[0].docNotes).toBe('DOC-owned note');
        expect(component.rows[1].docDecision).toBe('Do Not Pay');
        expect(component.rows[1].docNotes).toBe('new shared note');
      });

      it('leaves decisions and notes unchanged when the mixed-source warning is cancelled', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(mixedOriginRows(
          { docNotes: 'DOC note' },
          { docNotes: 'OEFIA note' }
        ));
        const before = component.rows.map(row => ({ docDecision: row.docDecision, docNotes: row.docNotes }));
        const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
        const dismiss = jasmine.createSpy('dismiss');
        modalService.open.and.returnValue({ close: jasmine.createSpy('close'), dismiss } as any);
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'shared note' };

        component.onApplyChanges();
        component.onCancelDoNotPayWarning();

        expect(modalService.open).toHaveBeenCalled();
        expect(dismiss).toHaveBeenCalled();
        expect(component.rows.map(row => ({ docDecision: row.docDecision, docNotes: row.docNotes }))).toEqual(before);
        expect(component.canSave).toBeFalse();
      });

      it('does not assign empty shared notes and validates every resulting Do Not Pay row', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(mixedOriginRows(
          { docDecision: 'Do Not Pay', docNotes: '' },
          { docDecision: 'Pay', docNotes: 'existing eligible note' }
        ));

        applyAndProceedDoNotPay('');
        fixture.detectChanges();

        expect(component.rows[0].docNotes).toBe('');
        expect(component.rows[1].docDecision).toBe('Do Not Pay');
        expect(component.rows[1].docNotes).toBe('existing eligible note');
        expect(component.hasDoNotPayDocNotesError(component.rows[0])).toBeTrue();
        expect(component.hasDoNotPayDocNotesError(component.rows[1])).toBeFalse();
        expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
        expect(getSaveButton().disabled).toBeTrue();
      });

      it('assigns whitespace-only notes to eligible rows but treats them as blank for validation', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(mixedOriginRows(
          { docDecision: 'Do Not Pay', docNotes: '' },
          { docDecision: 'Pay', docNotes: 'existing eligible note' }
        ));

        applyAndProceedDoNotPay('   ');
        fixture.detectChanges();

        expect(component.rows[0].docNotes).toBe('');
        expect(component.rows[1].docNotes).toBe('   ');
        expect(component.hasDoNotPayDocNotesError(component.rows[0])).toBeTrue();
        expect(component.hasDoNotPayDocNotesError(component.rows[1])).toBeTrue();
        expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
        expect(getSaveButton().disabled).toBeTrue();
      });

      it('keeps DOC-only notes-only and Pay-with-notes application available for both origins', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(mixedOriginRows());

        component.bulkFields = { docNotes: 'notes-only update' };
        component.onApplyChanges();

        expect(component.rows.map(row => row.docNotes)).toEqual(['notes-only update', 'notes-only update']);
        expect(component.rows.map(row => row.docDecision)).toEqual(['Pay', 'Pay']);

        component.bulkFields = { docDecision: 'Pay', docNotes: 'Pay note' };
        component.onApplyChanges();

        expect(component.rows.map(row => row.docDecision)).toEqual(['Pay', 'Pay']);
        expect(component.rows.map(row => row.docNotes)).toEqual(['Pay note', 'Pay note']);
      });

      it('keeps OEFIA-only Do Not Pay application available for both origins', () => {
        setRoles(false, true);
        initializeFixtureWithGrants(mixedOriginRows());
        const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'authorized shared note' };

        component.onApplyChanges();

        expect(modalService.open).not.toHaveBeenCalled();
        expect(component.rows.map(row => row.docDecision)).toEqual(['Do Not Pay', 'Do Not Pay']);
        expect(component.rows.map(row => row.docNotes)).toEqual(['authorized shared note', 'authorized shared note']);
      });

      it('keeps dual-role Do Not Pay application available for both origins', () => {
        setRoles(true, true);
        initializeFixtureWithGrants(mixedOriginRows());
        const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'authorized shared note' };

        component.onApplyChanges();

        expect(modalService.open).not.toHaveBeenCalled();
        expect(component.rows.map(row => row.docDecision)).toEqual(['Do Not Pay', 'Do Not Pay']);
        expect(component.rows.map(row => row.docNotes)).toEqual(['authorized shared note', 'authorized shared note']);
      });

      it('applies Do Not Pay and notes without a warning for an eligible-only selection', () => {
        setRoles(true, false);
        initializeFixtureWithGrants([grant({ addedByGroup: 'OEFIA' })]);
        const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'eligible note' };

        component.onApplyChanges();

        expect(modalService.open).not.toHaveBeenCalled();
        expect(component.rows[0].docDecision).toBe('Do Not Pay');
        expect(component.rows[0].docNotes).toBe('eligible note');
      });

      it('keeps Save disabled after a no-op application to clean rows', () => {
        setRoles(true, false);
        initializeFixtureWithGrants([
          grant({ addedByGroup: 'OEFIA', docNotes: 'existing note' })
        ]);
        component.bulkFields = { docNotes: 'existing note' };

        component.onApplyChanges();

        expect(component.canSave).toBeFalse();
        expect(getSaveButton().disabled).toBeTrue();
      });
    });

    describe('FS-2120 — all-DOC-added Do Not Pay selection', () => {
      function allDocRows(): any[] {
        return [
          grant({ applId: 100, addedByGroup: 'DOC', docNotes: 'first DOC note' }),
          grant({ applId: 200, addedByGroup: 'DOC', docNotes: 'second DOC note' })
        ];
      }

      function stubWarningModal(): { open: jasmine.Spy; close: jasmine.Spy; dismiss: jasmine.Spy } {
        const modalService = TestBed.inject(NgbModal) as jasmine.SpyObj<NgbModal>;
        const close = jasmine.createSpy('close');
        const dismiss = jasmine.createSpy('dismiss');
        modalService.open.and.returnValue({ close, dismiss } as any);
        return { open: modalService.open, close, dismiss };
      }

      function rowSnapshot(): any[] {
        return component.rows.map(row => ({
          docDecision: row.docDecision,
          docNotes: row.docNotes,
          budgetCategories: row.budgetCategories,
          docNciSelection: row.docNciSelection,
          annualOrMyf: row.annualOrMyf,
          docPriority: row.docPriority,
          recused: row.recused
        }));
      }

      it('warns a DOC-only user and skips every DOC-added row on proceed', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(allDocRows());
        const before = rowSnapshot();
        const modal = stubWarningModal();
        const loadDocPayDefaults = spyOn(component, 'loadDocPayDefaults').and.callThrough();
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'shared DOC note' };

        component.onApplyChanges();

        expect(modal.open).toHaveBeenCalled();
        expect(rowSnapshot()).toEqual(before);

        component.onProceedDoNotPayWarning();

        expect(modal.close).toHaveBeenCalled();
        expect(rowSnapshot()).toEqual(before);
        expect(component.rows.some(row => row.docDecision === 'Do Not Pay')).toBeFalse();
        expect(loadDocPayDefaults).toHaveBeenCalled();
        expect(component.canSave).toBeFalse();
      });

      it('leaves every row unchanged when the warning is cancelled', () => {
        setRoles(true, false);
        initializeFixtureWithGrants(allDocRows());
        const before = rowSnapshot();
        const modal = stubWarningModal();
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'shared DOC note' };

        component.onApplyChanges();
        component.onCancelDoNotPayWarning();

        expect(modal.open).toHaveBeenCalled();
        expect(modal.dismiss).toHaveBeenCalled();
        expect(rowSnapshot()).toEqual(before);
        expect(component.canSave).toBeFalse();
      });

      ['', '   '].forEach(notes => {
        it(`produces no Do Not Pay rows or note errors on proceed with notes ${JSON.stringify(notes)}`, () => {
          setRoles(true, false);
          initializeFixtureWithGrants(allDocRows());
          const before = rowSnapshot();
          stubWarningModal();
          component.bulkFields = { docDecision: 'Do Not Pay', docNotes: notes };

          component.onApplyChanges();
          component.onProceedDoNotPayWarning();
          fixture.detectChanges();

          expect(rowSnapshot()).toEqual(before);
          expect(component.hasDoNotPayDocNotesErrors).toBeFalse();
          expect(component.showBulkDoNotPayDocNotesError).toBeFalse();
          expect(component.canSave).toBeFalse();
          expect(getSaveButton().disabled).toBeTrue();
        });
      });

      it('keeps dependent fields on a skipped DOC-added row already at Do Not Pay', () => {
        setRoles(true, false);
        initializeFixtureWithGrants([
          grant({ applId: 100, addedByGroup: 'DOC', docDecision: 'Do Not Pay', docNotes: 'DOC-owned note' }),
          grant({ applId: 200, addedByGroup: 'OEFIA' })
        ]);
        const docRowBefore = rowSnapshot()[0];
        expect(docRowBefore.budgetCategories).not.toBeNull();
        expect(docRowBefore.docNciSelection).not.toBeNull();
        expect(docRowBefore.annualOrMyf).not.toBeNull();
        expect(docRowBefore.docPriority).not.toBeNull();
        const modal = stubWarningModal();
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'shared note' };

        component.onApplyChanges();
        component.onProceedDoNotPayWarning();

        expect(modal.open).toHaveBeenCalled();
        expect(rowSnapshot()[0]).toEqual(docRowBefore);
        expect(component.rows[1].docDecision).toBe('Do Not Pay');
        expect(component.rows[1].docNotes).toBe('shared note');
        expect(component.rows[1].budgetCategories).toBeNull();
        expect(component.rows[1].docNciSelection).toBeNull();
        expect(component.rows[1].docPriority).toBeNull();
      });

      it('warns for DOC-added plus blank-origin rows and applies Do Not Pay only to the blank-origin row', () => {
        setRoles(true, false);
        initializeFixtureWithGrants([
          grant({ applId: 100, addedByGroup: 'DOC', docNotes: 'DOC note' }),
          grant({ applId: 200, addedByGroup: '' })
        ]);
        const modal = stubWarningModal();
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'shared note' };

        component.onApplyChanges();
        expect(modal.open).toHaveBeenCalled();
        component.onProceedDoNotPayWarning();

        expect(component.rows[0].docDecision).toBe('Pay');
        expect(component.rows[0].docNotes).toBe('DOC note');
        expect(component.rows[1].docDecision).toBe('Do Not Pay');
        expect(component.rows[1].docNotes).toBe('shared note');
      });

      it('applies Do Not Pay without a warning for a blank-origin-only selection', () => {
        setRoles(true, false);
        initializeFixtureWithGrants([grant({ applId: 200, addedByGroup: null })]);
        const modal = stubWarningModal();
        component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'shared note' };

        component.onApplyChanges();

        expect(modal.open).not.toHaveBeenCalled();
        expect(component.rows[0].docDecision).toBe('Do Not Pay');
        expect(component.rows[0].docNotes).toBe('shared note');
      });

      [
        { label: 'OEFIA-only', doc: false, oefia: true },
        { label: 'dual-role', doc: true, oefia: true }
      ].forEach(({ label, doc, oefia }) => {
        it(`applies Do Not Pay to an all-DOC-added selection without a warning for ${label} users`, () => {
          setRoles(doc, oefia);
          initializeFixtureWithGrants(allDocRows());
          const modal = stubWarningModal();
          component.bulkFields = { docDecision: 'Do Not Pay', docNotes: 'authorized note' };

          component.onApplyChanges();

          expect(modal.open).not.toHaveBeenCalled();
          expect(component.rows.map(row => row.docDecision)).toEqual(['Do Not Pay', 'Do Not Pay']);
          expect(component.rows.map(row => row.docNotes)).toEqual(['authorized note', 'authorized note']);
        });
      });
    });

    it('exposes the exact tooltip by hover and keyboard focus while shared values are unapplied', fakeAsync(() => {
      spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, selectionDate: '', grants: [grant()] });
      fixture.detectChanges();
      component.bulkFields = { docNotes: 'unapplied shared note' };
      component.onBulkFieldChange();
      fixture.detectChanges();

      const tooltipDebugElement = fixture.debugElement.queryAll(By.directive(NgbTooltip))
        .find(element => element.injector.get(NgbTooltip).ngbTooltip === 'Apply changes prior to saving');
      expect(tooltipDebugElement).toBeDefined();
      const tooltip = tooltipDebugElement!.injector.get(NgbTooltip);
      const wrapper = tooltipDebugElement!.nativeElement as HTMLElement;
      const saveButton = wrapper.querySelector('button') as HTMLButtonElement;

      expect(tooltip.ngbTooltip).toBe('Apply changes prior to saving');
      expect(tooltip.triggers).toBe('hover focus');
      expect(tooltip.disableTooltip).toBeFalse();
      expect(wrapper.tabIndex).toBe(0);
      expect(saveButton.disabled).toBeTrue();

      wrapper.focus();
      tick();
      fixture.detectChanges();
      expect(document.body.querySelector('.tooltip-inner')?.textContent?.trim())
        .toBe('Apply changes prior to saving');
      tooltip.close();
      fixture.detectChanges();

      wrapper.dispatchEvent(new MouseEvent('mouseenter'));
      tick();
      fixture.detectChanges();
      expect(document.body.querySelector('.tooltip-inner')?.textContent?.trim())
        .toBe('Apply changes prior to saving');
      tooltip.close();
      discardPeriodicTasks();
    }));

    it('does not refresh dirty state or show success after a failed save, and permits retry', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'original note' })]);
      component.rows[0].docNotes = 'pending change';
      component.onRowFieldChange();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(
        throwError(() => ({ error: { detail: 'DOC reduction pair is inconsistent.' } }))
      );

      component.onSave();

      expect(component.saveSuccessMessage).toBe('');
      expect(component.saveErrorMessage).toBe('DOC reduction pair is inconsistent.');
      expect(component.canSave).toBeTrue();
      expect(component.rows[0].docNotes).toBe('pending change');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim())
        .toBe('DOC reduction pair is inconsistent.');

      component.rows[0].docNotes = 'original note';
      component.onRowFieldChange();
      expect(component.canSave).toBeFalse();

      component.rows[0].docNotes = 'corrected change';
      component.onRowFieldChange();
      expect(component.canSave).toBeTrue();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));
      component.onSave();

      expect(component.saveSuccessMessage).toBe('Success! Bulk changes have been applied');
      expect(component.saveErrorMessage).toBe('');
      expect(component.canSave).toBeFalse();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(2);
    });

    it('shows a generic error when the server provides no save message', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'original note' })]);
      component.rows[0].docNotes = 'pending change';
      component.onRowFieldChange();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(
        throwError(() => ({ status: 500 }))
      );

      component.onSave();

      expect(component.saveErrorMessage).toBe('Unable to save the grant changes. Please try again.');
      expect(component.canSave).toBeTrue();
      expect(component.rows[0].docNotes).toBe('pending change');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim())
        .toBe('Unable to save the grant changes. Please try again.');
    });

    it('shows exact success copy, blocks duplicate saves, and compares future edits with the saved baseline', () => {
      seedHistoryStateAndInit([grant({ docNotes: 'original note' })]);
      component.rows[0].docNotes = 'saved note';
      component.onRowFieldChange();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

      component.onSave();

      expect(component.saveSuccessMessage).toBe('Success! Bulk changes have been applied');
      expect(component.canSave).toBeFalse();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);

      component.rows[0].docNotes = 'original note';
      component.onRowFieldChange();

      expect(component.canSave).toBeTrue();
    });

    it('only shows the unapplied-shared-value tooltip while Save is unavailable', () => {
      seedHistoryStateAndInit([grant()]);
      component.bulkFields = { docNotes: 'shared value' };
      component.onBulkFieldChange();
      expect(component.showApplyBeforeSaveTooltip).toBeTrue();

      component.onApplyChanges();
      expect(component.showApplyBeforeSaveTooltip).toBeFalse();
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
