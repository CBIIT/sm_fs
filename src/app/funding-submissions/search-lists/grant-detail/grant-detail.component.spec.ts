import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { NgSelect2Module } from 'ng-select2';
import { EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionBulkEditRequestDto, FundingSubmissionDocPayDefaultsDto, FundingSubmissionListDetailDto, FundingSubmissionListGrantDto, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from '../../../service/app-user-session.service';
import { roleNames } from '../../../service/role-names';

import { GrantDetailComponent } from './grant-detail.component';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { DocumentService } from '../../../service/document.service';
import { UserSelect2ChangeDirective } from '../../user-select2-change.directive';
import { FUNDING_WRITE_RECOVERY_STORAGE, FundingWriteRecoveryService } from '../../funding-write-recovery.service';
import { MemoryStorage } from '../../testing/memory-storage';

@Component({
  template: '<app-grant-detail [data]="grant" [listId]="listId"></app-grant-detail>'
})
class BoundGrantDetailHost {
  grant: any;
  listId = 1;
}

describe('GrantDetailComponent', () => {
  let component: GrantDetailComponent;
  let fixture: ComponentFixture<GrantDetailComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<Omit<FundingSubmissionsService,
    'getDocPayDefaults' | 'getDocPriorityOptions' | 'getListDetail' | 'bulkUpdateListGrants' | 'getBudgetCategoryOptions'> & {
      getDocPayDefaults(listId: number, applIds: number[]): Observable<FundingSubmissionDocPayDefaultsDto[]>;
      getDocPriorityOptions(listId: number, applId: number): Observable<number[]>;
      getBudgetCategoryOptions(applId: number): Observable<Array<{ code?: string; name?: string }>>;
      getListDetail(listId: number): Observable<FundingSubmissionListDetailDto>;
      bulkUpdateListGrants(body: FundingSubmissionBulkEditRequestDto, listId: number): Observable<number>;
    }>;
  let dropdownLookupServiceSpy: jasmine.SpyObj<FundingSubmDropdownLookupService>;
  let userSessionServiceSpy: jasmine.SpyObj<AppUserSessionService>;
  let documentServiceSpy: jasmine.SpyObj<DocumentService>;
  let getJustificationSubject: Subject<any>;
  // Tests can delay the grant-specific lookup independently of justification loading.
  let getBudgetCategoriesSubject: Subject<any>;

  beforeEach(async () => {
    getJustificationSubject = new Subject<any>();
    getBudgetCategoriesSubject = new Subject<any>();

    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', [
      'getJustification', 'saveJustificationForm', 'bulkUpdateListGrants', 'getDocPriorityOptions',
      'getDocPayDefaults', 'getListDetail', 'getBudgetCategoryOptions'
    ]);
    fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());
    fundingSubmissionsServiceSpy.getBudgetCategoryOptions.and.returnValue(of([
      { code: 'ESIR37T4', name: 'ESI R37 T4 Board Competing Transition' },
      { code: 'OTHER', name: 'Other Category' }
    ]));
    (fundingSubmissionsServiceSpy.getDocPriorityOptions as jasmine.Spy).and.returnValue(of([1, 2, 3, 4, 5]));
    fundingSubmissionsServiceSpy.getListDetail.and.callFake(() => {
      const fields = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0].fields;
      return of({ grants: [{
        ...component.data,
        docDecision: fields.docDecision,
        docPriority: fields.docPriority == null ? null : Number(fields.docPriority),
        docRecommendedAmount: fields.docRecAmt,
        docRecommendedReductionPct: fields.docRecReductionPct,
        budgetCategoryCode: fields.budgetCategories,
        budgetCategories: component.budgetCategoryOptions.find(option => option.id === fields.budgetCategories)?.text ?? null,
        docNciSelection: fields.docNciSelection,
        docNciSelectionName: component.selectionOptions.find(option => option.id === fields.docNciSelection)?.text ?? null,
        annualOrMyf: fields.annualOrMyf,
        annualOrMyfName: component.annualMyfOptions.find(option => option.id === fields.annualOrMyf)?.text ?? null,
        annualFundingR01: fields.annualFundingR01,
        twoYearAnnualFundingR01Flag: fields.annualFundingR01 === 'Yes',
        docNotes: fields.docNotes,
        oefiaNotes: fields.oefiaNotes
      }] });
    });

    dropdownLookupServiceSpy = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
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

    userSessionServiceSpy = jasmine.createSpyObj('AppUserSessionService', ['hasRole']);
    userSessionServiceSpy.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);

    documentServiceSpy = jasmine.createSpyObj('DocumentService', ['downloadById']);
    documentServiceSpy.downloadById.and.returnValue(of({
      body: new Blob(['doc-content']),
      headers: { get: () => 'application/pdf' }
    } as any));

    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NgSelect2Module, NgbTooltipModule],
      declarations: [GrantDetailComponent, UserSelect2ChangeDirective, BoundGrantDetailHost],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: AppUserSessionService, useValue: userSessionServiceSpy },
        { provide: DocumentService, useValue: documentServiceSpy },
        { provide: FUNDING_WRITE_RECOVERY_STORAGE, useValue: new MemoryStorage() },
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

  describe('FS-2679 DOC Pay defaults and saved readback', () => {
    let defaultsResponse: Subject<FundingSubmissionDocPayDefaultsDto[]>;
    const resolvedDefaults: FundingSubmissionDocPayDefaultsDto = {
      applId: 100, transitionEligible: true,
      budgetCategories: 'R01R37', budgetCategoriesName: 'R01/R37',
      docNciSelection: 'DOC', docNciSelectionName: 'DOC',
      annualFundingR01: 'No', annualOrMyf: 'MYF Alloc', annualOrMyfName: 'MYF',
      docPriority: '1', docRecAmt: 90000, docRecReductionPct: 10
    };

    function choosePay(): void {
      component.formModel.docDecision = 'Pay';
      component.onDocDecisionChange();
    }

    function validRecommendation(): void {
      component.formModel.docPriority = '1';
      component.formModel.docRecAmt = 90000;
      component.formModel.docRecReductionPct = 10;
    }

    function persistedGrant(overrides: Partial<FundingSubmissionListGrantDto> = {}): FundingSubmissionListGrantDto {
      return {
        applId: 100, grantNumber: '1R01CA123456-01', docDecision: 'Pay',
        docPriority: 1, docRecommendedAmount: 90000, docRecommendedReductionPct: 10,
        budgetCategoryCode: 'SAVED', budgetCategories: 'Saved category',
        docNciSelection: 'NCI', docNciSelectionName: 'Saved selection',
        annualOrMyf: 'AF Alloc', annualOrMyfName: 'Saved Annual',
        annualFundingR01: 'Yes', twoYearAnnualFundingR01Flag: true,
        recusedFlag: true, docNotes: 'Saved note', oefiaNotes: 'Stored OEFIA note',
        ...overrides
      };
    }

    beforeEach(() => {
      defaultsResponse = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(defaultsResponse);
      component.data = {
        applId: 100, grantNumber: '1R01CA123456-01', docDecision: 'Do Not Pay',
        addedByGroup: 'OEFIA', originalRequestedTotal: 100000,
        annualFundingR01: null, budgetCategoryCode: null, budgetCategories: null,
        docNciSelection: null, annualOrMyf: null, annualOrMyfName: null,
        docNotes: 'Stored note', oefiaNotes: 'Stored OEFIA note', recusedFlag: true
      };
      dropdownLookupServiceSpy.getDocDecisions.and.returnValue(of([
        { id: 'Pay', text: 'Pay' }, { id: 'Do Not Pay', text: 'Do Not Pay' }
      ]));
      dropdownLookupServiceSpy.getAnnualFundingR01Options.and.returnValue(of([
        { id: 'Yes', text: 'Yes' }, { id: 'No', text: 'No' }
      ]));
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();
      validRecommendation();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
    });

    it('loads authoritative defaults before Save, displays DOC read-only names, and leaves the persisted row untouched', () => {
      choosePay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledWith(1, [100]);
      expect(component.docPayDefaultsLoading).toBeTrue();
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();

      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel).toEqual(jasmine.objectContaining({
        budgetCategories: 'R01R37', docNciSelection: 'DOC', annualFundingR01: 'No', annualOrMyf: 'MYF Alloc'
      }));
      expect(component.data.budgetCategoryCode).toBeNull();
      expect(component.data.annualOrMyf).toBeNull();
      expect(component.budgetCategoriesDisplay).toBe('R01/R37');
      expect(component.annualOrMyfDisplay).toBe('MYF');
      expect(fixture.nativeElement.textContent).toContain('R01/R37');
      expect(fixture.nativeElement.textContent).toContain('MYF');
      expect(fixture.nativeElement.querySelector('ng-select2[name="budgetCategories"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('ng-select2[name="annualOrMyf"]')).toBeNull();
      expect(component.yesNoOptions.map(option => option.id)).toEqual(['Yes', 'No']);
      expect(component.hasSaveValidationErrors).toBeFalse();
    });

    it('preserves the reported explicit 2Y Yes while restoring the other three selections', () => {
      component.formModel.annualFundingR01 = 'Yes';
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel.annualFundingR01).toBe('Yes');
      component.onSave();
      const fields = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0].fields;
      expect(fields).toEqual(jasmine.objectContaining({
        budgetCategories: 'R01R37', docNciSelection: 'DOC', annualOrMyf: 'MYF Alloc', annualFundingR01: 'Yes'
      }));
      expect(Object.prototype.hasOwnProperty.call(fields, 'recused')).toBeFalse();
    });

    for (const annualFundingR01 of ['Yes', 'No']) {
      it(`preserves every populated submitted selection including NCI and 2Y ${annualFundingR01}`, () => {
        Object.assign(component.formModel, {
          budgetCategories: 'EXPLICIT', docNciSelection: 'NCI', annualFundingR01, annualOrMyf: 'AF Alloc'
        });
        choosePay();
        defaultsResponse.next([resolvedDefaults]);
        expect(component.formModel).toEqual(jasmine.objectContaining({
          budgetCategories: 'EXPLICIT', docNciSelection: 'NCI', annualFundingR01, annualOrMyf: 'AF Alloc'
        }));
      });
    }

    it('uses stored-value preservation supplied by the service instead of replacing it with a generated default', () => {
      choosePay();
      defaultsResponse.next([{
        ...resolvedDefaults, budgetCategories: 'STORED', budgetCategoriesName: 'Stored category',
        docNciSelection: 'NCI', annualFundingR01: 'Yes', annualOrMyf: 'AF Alloc', annualOrMyfName: 'Annual'
      }]);
      expect(component.formModel.budgetCategories).toBe('STORED');
      expect(component.formModel.docNciSelection).toBe('NCI');
      expect(component.formModel.annualFundingR01).toBe('Yes');
      expect(component.formModel.annualOrMyf).toBe('AF Alloc');
    });

    for (const activity of ['R03', 'R15', 'U01', 'missing activity']) {
      it(`leaves 2Y blank for ${activity} and retains the service's required-field rejection`, () => {
        choosePay();
        defaultsResponse.next([{
          ...resolvedDefaults, annualFundingR01: null,
          annualOrMyf: ['R03', 'R15'].includes(activity) ? 'MYF Alloc' : 'AF Alloc'
        }]);
        expect(component.formModel.annualFundingR01).toBeNull();
        fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(throwError(() => ({
          status: 400, error: { errorMessage: 'Two-Year Annual Funding R01 (HRHR) is required.' }
        })));
        component.onSave();
        expect(component.fundingSaveError).toBe('Two-Year Annual Funding R01 (HRHR) is required.');
        expect(component.isEditMode).toBeTrue();
        expect(component.saveSuccessMessage).toBe('');
      });
    }

    it('does not replace a newer selection or a selection explicitly cleared while defaults are delayed', () => {
      choosePay();
      component.formModel.docNciSelection = 'NCI';
      component.onDocPaySelectionChange('docNciSelection');
      component.formModel.annualFundingR01 = 'Yes';
      component.onDocPaySelectionChange('annualFundingR01');
      component.formModel.annualFundingR01 = null;
      component.onDocPaySelectionChange('annualFundingR01');
      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel.docNciSelection).toBe('NCI');
      expect(component.formModel.annualFundingR01).toBeNull();
    });

    it('does not mistake unchanged Select2 binding emissions for newer selections', () => {
      choosePay();
      component.onDocPaySelectionChange('docNciSelection');
      component.onDocPaySelectionChange('annualFundingR01');
      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel.docNciSelection).toBe('DOC');
      expect(component.formModel.annualFundingR01).toBe('No');
    });

    it('also resolves defaults before a direct Save that bypassed the decision-change handler', () => {
      component.formModel.docDecision = 'Pay';
      component.onSave();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledWith(1, [100]);
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      defaultsResponse.next([resolvedDefaults]);
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    });

    for (const change of ['decision', 'cancel/reopen', 'different grant', 'different list', 'destroy']) {
      it(`ignores defaults delayed past ${change}`, () => {
        choosePay();
        const originalForm = component.formModel;
        if (change === 'decision') {
          component.formModel.docDecision = 'Do Not Pay';
          component.onDocDecisionChange();
        } else if (change === 'cancel/reopen') {
          component.forceDiscardAndClose();
          component.onEdit();
        } else if (change === 'different grant') {
          component.data = { ...component.data, applId: 200 };
          component.ngOnChanges({ data: {} as any });
        } else if (change === 'different list') {
          component.listId = 2;
        } else {
          component.ngOnDestroy();
        }
        defaultsResponse.next([resolvedDefaults]);
        expect(originalForm.budgetCategories).toBeNull();
        expect(component.data.budgetCategoryCode).toBeNull();
      });
    }

    it('discards older defaults when a newer Pay transition starts', () => {
      choosePay();
      const newerResponse = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(newerResponse);
      component.formModel.docDecision = 'Do Not Pay';
      component.onDocDecisionChange();
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel.budgetCategories).toBeNull();
      newerResponse.next([{ ...resolvedDefaults, budgetCategories: 'NEW' }]);
      expect(component.formModel.budgetCategories).toBe('NEW');
    });

    it('reverts preview names and selections on Cancel without mutating the grid row', () => {
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      component.forceDiscardAndClose();
      expect(component.budgetCategoriesDisplay).toBeNull();
      expect(component.annualOrMyfDisplay).toBeNull();
      component.onEdit();
      expect(component.formModel.docDecision).toBe('Do Not Pay');
      expect(component.formModel.budgetCategories).toBeNull();
    });

    for (const role of ['DOC/OEFIA', 'DOC/Financial Analyst']) {
      it(`resolves defaults for a ${role} dual-role caller while keeping the DOC fields read-only`, () => {
        component.OEFIACertifier = role === 'DOC/OEFIA';
        component.financialAnalyst = role === 'DOC/Financial Analyst';
        choosePay();
        defaultsResponse.next([resolvedDefaults]);
        expect(component.formModel.annualOrMyf).toBe('MYF Alloc');
        expect(fixture.nativeElement.querySelector('ng-select2[name="annualOrMyf"]')).toBeNull();
      });
    }

    for (const role of ['DOC', 'OEFIA', 'Financial Analyst', 'DOC/OEFIA', 'DOC/Financial Analyst']) {
      it(`sends automatic per-row provenance and shows persisted values for ${role}`, () => {
        component.docFundingListCor = role.includes('DOC');
        component.OEFIACertifier = role.includes('OEFIA');
        component.financialAnalyst = role.includes('Financial Analyst');
        Object.assign(component.formModel, { docPriority: null, docRecAmt: null, docRecReductionPct: null });
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
          grants: [persistedGrant({ docPriority: 4, docRecommendedAmount: 73000, docRecommendedReductionPct: 27 })]
        }));
        choosePay();
        defaultsResponse.next([resolvedDefaults]);
        expect(component.formModel).toEqual(jasmine.objectContaining({
          docPriority: '1', docRecAmt: 90000, docRecReductionPct: 10
        }));
        component.onSave();
        const request = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0];
        expect(request.transitionIntents).toEqual([{ applId: 100, priorityMode: 'AUTO', editedFields: [] }]);
        expect(component.data).toEqual(jasmine.objectContaining({
          docPriority: 4, docRecommendedAmount: 73000, docRecommendedReductionPct: 27
        }));
      });
    }

    it('does not replace delayed manual priority or recommendation edits, including a deliberate clear', () => {
      Object.assign(component.formModel, { docPriority: null, docRecAmt: null, docRecReductionPct: null });
      choosePay();
      component.onUserSelectChange('docPriority', '2');
      component.formModel.docRecAmt = 50000;
      component.onDocRecAmtChange();
      component.formModel.docRecAmt = null;
      component.onDocRecAmtChange();
      component.onUserSelectChange('annualFundingR01', 'Yes');
      component.onUserSelectChange('annualFundingR01', null);
      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel).toEqual(jasmine.objectContaining({
        docPriority: '2', docRecAmt: null, docRecReductionPct: 50, annualFundingR01: null
      }));
      expect(component.hasSaveValidationErrors).toBeTrue();
      component.formModel.docRecAmt = 80000;
      component.onDocRecAmtChange();
      component.onSave();
      const request = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0];
      expect(request.transitionIntents).toEqual([{
        applId: 100, priorityMode: 'SUBMITTED', editedFields: ['docRecAmt', 'annualFundingR01']
      }]);
      expect(request.fields.docRecReductionPct).toBe(20);
      expect(request.fields.annualFundingR01).toBeNull();
    });

    it('does not restore a user-cleared priority or combine an existing recommendation half with a preview', () => {
      Object.assign(component.formModel, { docPriority: null, docRecAmt: 0, docRecReductionPct: null });
      choosePay();
      component.onUserSelectChange('docPriority', '2');
      component.onUserSelectChange('docPriority', null);
      defaultsResponse.next([resolvedDefaults]);
      expect(component.formModel.docPriority).toBeNull();
      expect(component.formModel.docRecAmt).toBe(0);
      expect(component.formModel.docRecReductionPct).toBeNull();
      component.onSave();
      expect(component.saveValidationErrors.docPriority).toBeTruthy();
      expect(component.saveValidationErrors.docRecReductionPct).toBeTruthy();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('preserves an automatic zero recommendation pair and AUTO through repeated previews', () => {
      Object.assign(component.formModel, { docPriority: null, docRecAmt: null, docRecReductionPct: null });
      const zeroDefaults = { ...resolvedDefaults, docRecAmt: 0, docRecReductionPct: 0 };
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(of([zeroDefaults]));
      choosePay();
      choosePay();
      expect(component.formModel.docRecAmt).toBe(0);
      expect(component.formModel.docRecReductionPct).toBe(0);
      component.onSave();
      const request = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0];
      expect(request.fields.docRecAmt).toBe(0);
      expect(request.fields.docRecReductionPct).toBe(0);
      expect(request.transitionIntents).toEqual([{ applId: 100, priorityMode: 'AUTO', editedFields: [] }]);
    });

    it('waits for priority options arriving after the preview without losing the automatic value', () => {
      component.forceDiscardAndClose();
      const priorities = new Subject<number[]>();
      fundingSubmissionsServiceSpy.getDocPriorityOptions.and.returnValue(priorities);
      component.onEdit();
      Object.assign(component.formModel, { docPriority: null, docRecAmt: null, docRecReductionPct: null });
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      fixture.detectChanges();
      expect(component.formModel.docPriority).toBe('1');
      expect(component.docPriorityOptionsLoading).toBeTrue();
      expect(fixture.nativeElement.querySelector('ng-select2[name="docPriority"]')).toBeNull();
      priorities.next([1, 2, 3]);
      fixture.detectChanges();
      expect(component.docPriorityOptionsError).toBeNull();
      expect(component.formModel.docPriority).toBe('1');
      expect(fixture.nativeElement.querySelector('ng-select2[name="docPriority"]')).not.toBeNull();
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0].transitionIntents[0].priorityMode)
        .toBe('AUTO');
    });

    for (const response of ['error', 'empty', 'missing priority']) {
      it(`surfaces ${response} priority options and permits a retry`, () => {
        component.forceDiscardAndClose();
        fundingSubmissionsServiceSpy.getDocPriorityOptions.and.returnValue(response === 'error'
          ? throwError(() => new Error('Options unavailable')) : response === 'empty' ? EMPTY : of([2, 3]));
        component.onEdit();
        Object.assign(component.formModel, { docPriority: null, docRecAmt: null, docRecReductionPct: null });
        choosePay();
        defaultsResponse.next([resolvedDefaults]);
        expect(component.docPriorityOptionsError).toBeTruthy();
        component.onSave();
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
        fundingSubmissionsServiceSpy.getDocPriorityOptions.and.returnValue(of([1, 2, 3]));
        component.fetchDocPriorityOptions();
        expect(component.docPriorityOptionsError).toBeNull();
        expect(component.formModel.docPriority).toBe('1');
      });
    }

    it('does not block a non-transition edit solely because priority options failed to load', () => {
      component.forceDiscardAndClose();
      component.data.docDecision = 'Pay';
      fundingSubmissionsServiceSpy.getDocPriorityOptions.and.returnValue(
        throwError(() => new Error('Options unavailable'))
      );
      component.onEdit();
      validRecommendation();
      component.formModel.docNotes = 'Updated note';
      expect(component.docPriorityOptionsError).toBeTruthy();
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    });

    it('requests defaults for OEFIA-only callers but not an unrelated persisted Pay edit', () => {
      component.docFundingListCor = false;
      component.OEFIACertifier = true;
      choosePay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledTimes(1);
      component.docFundingListCor = true;
      component.data.docDecision = 'Pay';
      choosePay();
      expect(fundingSubmissionsServiceSpy.getDocPayDefaults).toHaveBeenCalledTimes(1);
    });

    for (const result of ['error', 'empty', 'missing row', 'ineligible', 'unresolved lookup']) {
      it(`blocks Save, preserves edits, and offers a defaults retry on ${result}`, () => {
        if (result === 'empty') fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(EMPTY);
        choosePay();
        if (result === 'error') defaultsResponse.error(new Error('Lookup unavailable'));
        if (result === 'missing row') defaultsResponse.next([]);
        if (result === 'ineligible') defaultsResponse.next([{ ...resolvedDefaults, transitionEligible: false }]);
        if (result === 'unresolved lookup') defaultsResponse.next([{ ...resolvedDefaults, annualOrMyf: null }]);
        expect(component.docPayDefaultsError).toBeTruthy();
        expect(component.formModel.docRecAmt).toBe(90000);
        expect(component.hasUnsavedChanges()).toBeTrue();
        component.onSave();
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
        fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(of([resolvedDefaults]));
        component.loadDocPayDefaults();
        expect(component.docPayDefaultsError).toBeNull();
        expect(component.formModel.budgetCategories).toBe('R01R37');
      });
    }

    it('refreshes a stale transition conflict without retrying its rejected write', () => {
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(of([resolvedDefaults]));
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(throwError(() => ({ status: 409 })));
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
        grants: [persistedGrant({ docDecision: 'Do Not Pay', docPriority: null })]
      }));
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
      expect(fundingSubmissionsServiceSpy.getListDetail).toHaveBeenCalledTimes(1);
      expect(component.fundingRecoveryState).toBeNull();
      expect(component.formModel.docDecision).toBe('Pay');
      expect(component.fundingSaveError).toContain('Review your unsaved changes');
      expect(component.isEditMode).toBeTrue();
    });

    it('keeps an ambiguous write across reopen until support confirmation and an authoritative read', () => {
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(throwError(() => ({ status: 500 })));
      component.onSave();
      expect(component.fundingRecoveryState).toBe('unknown');
      component.onSave();
      component.refreshSavedFunding();
      expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
      component.forceDiscardAndClose();
      component.onEdit();
      expect(component.fundingRecoveryState).toBe('unknown');
      component.recoverUnknownFunding();
      expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
      const response = new Subject<FundingSubmissionListDetailDto>();
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(response);
      component.unknownOutcomeConfirmed = true;
      component.recoverUnknownFunding();
      expect(component.fundingRecoveryState).toBe('unknown');
      response.next({ grants: [persistedGrant({ docPriority: 5 })] });
      expect(component.fundingRecoveryState).toBeNull();
      expect(component.data.docPriority).toBe(5);
      expect(component.fundingSaveError).toContain('Review your unsaved changes');
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
    });

    it('recognizes a recovery marker created by another open editor before sending a write', () => {
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      TestBed.inject(FundingWriteRecoveryService).begin(1, 100);
      component.onSave();
      expect(component.fundingRecoveryState).toBe('unknown');
      expect(component.fundingRecoveryError).toBeNull();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
    });

    it('retains an unknown recovery marker when a pending write is cancelled by destruction', () => {
      const write = new Subject<number>();
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(write);
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      component.onSave();
      component.ngOnDestroy();
      write.next(1);
      expect(TestBed.inject(FundingWriteRecoveryService).get(1, 100)?.state).toBe('unknown');
      expect(fundingSubmissionsServiceSpy.getListDetail).not.toHaveBeenCalled();
    });

    it('redraws the shared grid row only after actual saved readback and seeds subsequent edits from those values', () => {
      const row = component.data;
      const readbackResponse = new Subject<{ grants: FundingSubmissionListGrantDto[] }>();
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(readbackResponse);
      const saved = jasmine.createSpy('redraw grid');
      component.saved.subscribe(saved);
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      component.onSave();
      expect(saved).not.toHaveBeenCalled();
      expect(row.docDecision).toBe('Do Not Pay');
      readbackResponse.next({ grants: [persistedGrant()] });
      expect(saved).toHaveBeenCalledTimes(1);
      expect(component.data).toBe(row);
      expect(row.budgetCategoryCode).toBe('SAVED');
      expect(row.budgetCategories).toBe('Saved category');
      expect(row.annualOrMyfName).toBe('Saved Annual');
      expect(row.recusedFlag).toBeTrue();
      expect(component.isEditMode).toBeFalse();
      component.onEdit();
      expect(component.formModel.budgetCategories).toBe('SAVED');
      expect(component.formModel.docNciSelection).toBe('NCI');
      expect(component.formModel.annualOrMyf).toBe('AF Alloc');
      expect(component.formModel.annualFundingR01).toBe('Yes');
    });

    it('preserves newer edits during saved readback and uses actual persisted values as the dirty baseline', () => {
      const response = new Subject<{ grants: FundingSubmissionListGrantDto[] }>();
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(response);
      choosePay();
      defaultsResponse.next([resolvedDefaults]);
      component.onSave();
      component.formModel.docNotes = 'Newer unsaved note';
      component.formModel.docNciSelection = 'NEWER';
      component.onDocPaySelectionChange('docNciSelection');
      response.next({ grants: [persistedGrant()] });
      expect(component.data.docNciSelection).toBe('NCI');
      expect(component.formModel.docNciSelection).toBe('NEWER');
      expect(component.formModel.docNotes).toBe('Newer unsaved note');
      expect(component.formModel.budgetCategories).toBe('SAVED');
      expect(component.isEditMode).toBeTrue();
      expect(component.hasUnsavedChanges()).toBeTrue();
      expect(component.saveSuccessMessage).toContain('Your newer edits have not been saved.');
    });

    for (const failure of ['read error', 'empty read', 'missing saved row']) {
      it(`distinguishes a persisted save from ${failure} and retries only the read`, () => {
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(failure === 'read error'
          ? throwError(() => new Error('Read unavailable')) : failure === 'empty read' ? EMPTY : of({ grants: [] }));
        choosePay();
        defaultsResponse.next([resolvedDefaults]);
        component.onSave();
        expect(component.fundingRefreshError).toContain('Grant changes were saved');
        expect(component.data.docDecision).toBe('Do Not Pay');
        component.onSave();
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({ grants: [persistedGrant()] }));
        component.refreshSavedFunding();
        expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).toHaveBeenCalledTimes(1);
        expect(component.fundingRefreshError).toBeNull();
        expect(component.data.budgetCategoryCode).toBe('SAVED');
      });
    }

    for (const change of ['different grant', 'discard/reopen', 'destroy']) {
      it(`ignores saved readback after ${change}`, () => {
        const response = new Subject<{ grants: FundingSubmissionListGrantDto[] }>();
        fundingSubmissionsServiceSpy.getListDetail.and.returnValue(response);
        choosePay();
        defaultsResponse.next([resolvedDefaults]);
        component.onSave();
        if (change === 'different grant') component.data = { ...component.data, applId: 200 };
        if (change === 'discard/reopen') {
          component.forceDiscardAndClose();
          component.onEdit();
        }
        if (change === 'destroy') component.ngOnDestroy();
        response.next({ grants: [persistedGrant()] });
        expect(component.data.budgetCategoryCode).toBeNull();
      });
    }
  });

  it('maps DOC Priority numbers from the generated API to dropdown options when Edit opens', () => {
    (fundingSubmissionsServiceSpy.getDocPriorityOptions as jasmine.Spy).and.returnValue(of([1, 2, 3, 4, 5]));
    component.data.docPriority = 3;
    component.ngOnInit();
    getJustificationSubject.next({ justificationText: '' });

    component.onEdit();

    expect(fundingSubmissionsServiceSpy.getDocPriorityOptions).toHaveBeenCalledWith(1, 100);
    expect(component.docPriorityOptions).toEqual([
      { id: '1', text: '1' }, { id: '2', text: '2' }, { id: '3', text: '3' },
      { id: '4', text: '4' }, { id: '5', text: '5' }
    ]);
    expect(component.formModel.docPriority).toBe('3');
    const dropdown = fixture.debugElement.query(By.css('ng-select2[name="docPriority"]'));
    expect(dropdown).not.toBeNull();
    expect(dropdown.componentInstance.data).toEqual(component.docPriorityOptions);
    expect(fixture.nativeElement.querySelector('input[name="docPriority"]')).toBeNull();
  });

  it('updates DOC Priority and validation through the dropdown and preserves its lock', () => {
    component.ngOnInit();
    getJustificationSubject.next({ justificationText: '' });
    component.onEdit();
    const dropdown = fixture.debugElement.query(By.css('ng-select2[name="docPriority"]'));
    const validate = spyOn(component, 'onValidationFieldChange').and.callThrough();

    dropdown.triggerEventHandler('appUserSelect2Change', '5');

    expect(component.formModel.docPriority).toBe('5');
    expect(validate).toHaveBeenCalled();
    dropdown.triggerEventHandler('appUserSelect2Change', null);
    expect(component.formModel.docPriority).toBeNull();
    component.doNotPayOefiaLockActive = true;
    fixture.detectChanges();
    expect(dropdown.componentInstance.disabled).toBeTrue();
  });

  it('clears stale DOC Priority options and preserves the current value when loading fails', () => {
    fundingSubmissionsServiceSpy.getDocPriorityOptions.and.returnValue(throwError(() => new Error('Unavailable')));
    component.docPriorityOptions = [{ id: '9', text: '9' }];
    component.data.docPriority = 3;
    component.ngOnInit();
    getJustificationSubject.next({ justificationText: '' });

    component.onEdit();

    expect(component.docPriorityOptions).toEqual([]);
    expect(component.formModel.docPriority).toBe('3');
    expect(TestBed.inject(NGXLogger).error).toHaveBeenCalled();
  });

  it('cancels the DOC Priority options request when the detail component is destroyed', () => {
    const response = new Subject<number[]>();
    (fundingSubmissionsServiceSpy.getDocPriorityOptions as jasmine.Spy).and.returnValue(response);
    component.ngOnInit();
    getJustificationSubject.next({ justificationText: '' });
    component.onEdit();
    expect(response.observers.length).toBe(1);

    component.ngOnDestroy();

    expect(response.observers.length).toBe(0);
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

  it('hides Edit for OEFIA users', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();

    component.docFundingListCor = false;
    component.OEFIACertifier = true;
    component.financialAnalyst = false;
    component.listStatus = 'DOC Review';

    fixture.detectChanges();

    expect(component.canEnterEditMode).toBeFalse();
    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.btn-outline-primary');
    expect(editButton).toBeNull();
  });

  it('hides Edit for Financial Analyst users', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();

    component.docFundingListCor = false;
    component.OEFIACertifier = false;
    component.financialAnalyst = true;
    component.listStatus = 'DOC Review';

    fixture.detectChanges();

    expect(component.canEnterEditMode).toBeFalse();
    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.btn-outline-primary');
    expect(editButton).toBeNull();
  });

  it('allows Edit for DOC role when list status is not OEFIA/NCI Director Review once data is loaded', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();

    component.docFundingListCor = true;
    component.listStatus = 'Draft';

    component.onEdit();

    expect(component.isEditMode).toBeTrue();
  });

  it('shows enabled Edit button for DOC role when list status is DOC Review', () => {
    component.docFundingListCor = true;
    component.listStatus = 'DOC Review';

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.btn-outline-primary');
    expect(editButton).not.toBeNull();
    expect(editButton?.textContent?.trim()).toBe('Edit');
    expect(editButton?.disabled).toBeFalse();
  });

  it('hides Edit button for DOC role when list status is OEFIA Review', () => {
    component.docFundingListCor = true;
    component.listStatus = 'OEFIA Review';

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.btn-outline-primary');
    expect(editButton).toBeNull();
  });

  it('hides Edit button for DOC role when list status is NCI Director Review', () => {
    component.docFundingListCor = true;
    component.listStatus = 'NCI Director Review';

    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: '' });
    getJustificationSubject.complete();
    fixture.detectChanges();

    const editButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.btn-outline-primary');
    expect(editButton).toBeNull();
  });

  it('uses the grant review code to block DOC editing even when the list status is DOC Review', () => {
    component.docFundingListCor = true;
    component.listStatus = 'DOC Review';
    component.data = { applId: 100, reviewStatusCode: 'OEFIAREVIEW', reviewStatus: 'OEFIA Review' };

    expect(component.canEnterEditMode).toBeFalse();
  });

  it('blocks DOC editing for a grant in NCI Director Review even when the list status is DOC Review', () => {
    component.docFundingListCor = true;
    component.listStatus = 'DOC Review';
    component.data = { applId: 100, reviewStatusCode: 'DIRECTORREVIEW', reviewStatus: 'NCI Director Review' };

    expect(component.canEnterEditMode).toBeFalse();
  });

  it('allows DOC editing when the grant review code is DOCREVIEW even if the list status differs', () => {
    component.docFundingListCor = true;
    component.listStatus = 'OEFIA Review';
    component.data = { applId: 100, reviewStatusCode: 'DOCREVIEW', reviewStatus: 'DOC Review' };

    expect(component.canEnterEditMode).toBeTrue();
  });

  it('falls back to the grant review text before the list status for DOC edit gating', () => {
    component.docFundingListCor = true;
    component.listStatus = 'DOC Review';
    component.data = { applId: 100, reviewStatus: 'NCI Director Review' };

    expect(component.canEnterEditMode).toBeFalse();
  });

  it('blocks editing when an approved NCI decision is confirmed and locked', () => {
    component.docFundingListCor = false;
    component.listStatus = 'DOC Review';
    component.data = {
      applId: 100,
      nciDecision: 'Approve',
      lockedDate: new Date('2026-10-23T00:00:00Z')
    };

    expect(component.canEnterEditMode).toBeFalse();
  });

  it('blocks editing when a rejected NCI decision is confirmed and locked', () => {
    component.docFundingListCor = false;
    component.listStatus = 'DOC Review';
    component.data = {
      applId: 100,
      nciDecision: 'Rejected',
      lockedDate: new Date('2026-10-23T00:00:00Z')
    };

    expect(component.canEnterEditMode).toBeFalse();
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

  describe('FS-2391 raw annual R01 detail display', () => {
    [
      { raw: 'Yes', flag: false, expected: 'Yes' },
      { raw: 'No', flag: false, expected: 'No' },
      { raw: 'No', flag: true, expected: 'No' },
      { raw: null, flag: false, expected: '' },
      { raw: null, flag: true, expected: '' },
      { raw: undefined, flag: true, expected: 'Yes' },
      { raw: undefined, flag: false, expected: '' }
    ].forEach(({ raw, flag, expected }) => {
      it(`renders raw ${String(raw)} with legacy flag ${flag} as "${expected}"`, () => {
        component.data.annualFundingR01 = raw;
        component.data.twoYearAnnualFundingR01Flag = flag;
        fixture.detectChanges();
        getJustificationSubject.next({ justificationText: '' });
        getJustificationSubject.complete();
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement;
        const label = Array.from(element.querySelectorAll('td.grid-label'))
          .find(cell => cell.textContent.trim() === '2Y Annual Fnd R01:');
        expect(label).toBeDefined();
        expect(label.nextElementSibling.textContent.trim()).toBe(expected);
      });
    });
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

  describe('FS-2533 grant-specific Budget Categories', () => {
    beforeEach(() => {
      userSessionServiceSpy.hasRole.and.returnValue(false);
      component.data = {
        applId: 100, grantNumber: '1R01CA123456-01', justificationText: '',
        budgetCategories: 'P01', budgetCategoryCode: 'ACTCD'
      };
      fundingSubmissionsServiceSpy.getBudgetCategoryOptions.and.returnValue(getBudgetCategoriesSubject);
    });

    it('allows unrelated editing while pending and renders the detached view when options arrive', fakeAsync(() => {
      fixture.detectChanges();
      fixture.changeDetectorRef.detach();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();

      expect(fundingSubmissionsServiceSpy.getBudgetCategoryOptions).toHaveBeenCalledOnceWith(100);
      expect(dropdownLookupServiceSpy.getBudgetCategories).not.toHaveBeenCalled();
      expect(component.isEditMode).toBeTrue();
      expect(component.formModel.budgetCategories).toBe('ACTCD');
      expect(component.budgetCategoryOptionsForForm).toEqual([{ id: 'ACTCD', text: 'ACTCD (unresolved)' }]);
      expect(fixture.nativeElement.textContent).toContain('Loading Budget Categories');
      expect(component.hasUnsavedChanges()).toBeFalse();

      getBudgetCategoriesSubject.next([
        { code: 'R01R37', name: 'R01/R37' }, { code: 'ACTCD', name: 'P01' }
      ]);
      flushMicrotasks();

      expect(component.budgetCategoryOptionsForForm).toEqual([
        { id: 'R01R37', text: 'R01/R37' }, { id: 'ACTCD', text: 'P01' }
      ]);
      const select = fixture.debugElement.query(By.css('ng-select2[name="budgetCategories"]'));
      expect(select.componentInstance.data).toEqual(component.budgetCategoryOptionsForForm);
      expect(fixture.nativeElement.textContent).not.toContain('Loading Budget Categories');
      expect(component.formModel.budgetCategories).toBe('ACTCD');
      expect(component.hasUnsavedChanges()).toBeFalse();
    }));

    it('isolates a failure, preserves edits, and resolves a retry', fakeAsync(() => {
      fundingSubmissionsServiceSpy.getBudgetCategoryOptions.and.returnValues(
        getBudgetCategoriesSubject,
        of([{ code: 'ACTCD', name: 'P01' }, { code: 'PARU', name: "PAR U's" }])
      );
      fixture.detectChanges();
      fixture.changeDetectorRef.detach();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();
      component.formModel.docNotes = 'Keep this edit';

      getBudgetCategoriesSubject.error({ status: 404 });
      flushMicrotasks();
      expect(fixture.nativeElement.textContent).toContain('could not be loaded');
      expect(component.formModel.budgetCategories).toBe('ACTCD');
      expect(component.budgetCategoryOptionsForForm[0].text).toBe('ACTCD (unresolved)');

      const retryButton = fixture.nativeElement.querySelector('ng-select2[name="budgetCategories"]').parentElement
        .querySelector('button') as HTMLButtonElement;
      retryButton.click();
      flushMicrotasks();
      expect(component.budgetCategoryStatus).toBe('ready');
      expect(component.budgetCategoryOptionsForForm[0]).toEqual({ id: 'ACTCD', text: 'P01' });
      expect(component.formModel.docNotes).toBe('Keep this edit');
      expect(fundingSubmissionsServiceSpy.getBudgetCategoryOptions).toHaveBeenCalledTimes(2);
    }));

    it('replaces state for a directly assigned new grant and ignores the earlier response', fakeAsync(() => {
      const second = new Subject<any>();
      fundingSubmissionsServiceSpy.getBudgetCategoryOptions.and.callFake(applId =>
        applId === 100 ? getBudgetCategoriesSubject : second);
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();

      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));
      component.data = {
        applId: 200, grantNumber: '1R01CA000002-01', budgetCategoryCode: 'ACTCD', budgetCategories: 'R01'
      };
      expect(component.isEditMode).toBeFalse();
      expect(component.budgetCategoryStatus).toBe('loading');
      flushMicrotasks();
      component.onEdit();
      second.next([{ code: 'ACTCD', name: 'R01' }]);
      getBudgetCategoriesSubject.next([{ code: 'ACTCD', name: 'P01' }]);
      flushMicrotasks();

      expect(fundingSubmissionsServiceSpy.getBudgetCategoryOptions.calls.allArgs()).toEqual([[100], [200]]);
      expect(component.budgetCategoryOptionsForForm).toEqual([{ id: 'ACTCD', text: 'R01' }]);
      expect(component.formModel.budgetCategories).toBe('ACTCD');
      const select = fixture.debugElement.query(By.css('ng-select2[name="budgetCategories"]'));
      expect(select.componentInstance.data).toEqual([{ id: 'ACTCD', text: 'R01' }]);
    }));

    it('keeps an unavailable saved code visibly unresolved without replacing it', fakeAsync(() => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();
      getBudgetCategoriesSubject.next([{ code: 'RFA', name: 'RFA' }]);
      flushMicrotasks();

      expect(component.budgetCategoryOptionsForForm).toEqual([
        { id: 'RFA', text: 'RFA' }, { id: 'ACTCD', text: 'ACTCD (unresolved)' }
      ]);
      expect(fixture.nativeElement.textContent).toContain('not in the available options');
      expect(component.formModel.budgetCategories).toBe('ACTCD');
    }));

    it('unsubscribes pending grant options on destruction', () => {
      fixture.detectChanges();
      expect(getBudgetCategoriesSubject.observers.length).toBe(1);
      fixture.destroy();
      expect(getBudgetCategoriesSubject.observers.length).toBe(0);
      expect(() => getBudgetCategoriesSubject.next([{ code: 'ACTCD', name: 'P01' }])).not.toThrow();
    });

    it('supports normal Angular inputs and cannot apply stale grant or justification responses', fakeAsync(() => {
      const second = new Subject<any>();
      const oldJustification = new Subject<any>();
      const newJustification = new Subject<any>();
      fundingSubmissionsServiceSpy.getBudgetCategoryOptions.and.callFake(applId =>
        applId === 100 ? getBudgetCategoriesSubject : second);
      fundingSubmissionsServiceSpy.getJustification.and.callFake((_listId, applId) =>
        applId === 100 ? oldJustification : newJustification);
      const hostFixture = TestBed.createComponent(BoundGrantDetailHost);
      hostFixture.componentInstance.grant = {
        applId: 100, budgetCategoryCode: 'ACTCD', budgetCategories: 'P01', justificationText: 'A'
      };
      hostFixture.detectChanges();
      const detail = hostFixture.debugElement.query(By.directive(GrantDetailComponent)).componentInstance as GrantDetailComponent;
      hostFixture.componentInstance.grant = {
        applId: 200, budgetCategoryCode: 'ACTCD', budgetCategories: 'R01', justificationText: 'B'
      };
      hostFixture.detectChanges();
      expect(detail.budgetCategoryStatus).toBe('loading');
      second.next([{ code: 'ACTCD', name: 'R01' }]);
      getBudgetCategoriesSubject.next([{ code: 'ACTCD', name: 'P01' }]);
      oldJustification.next({ justificationText: 'stale A' });
      expect(detail.data.justificationText).toBe('B');
      newJustification.next({ justificationText: 'current B' });
      flushMicrotasks();
      detail.onEdit();
      expect(detail.formModel.budgetCategories).toBe('ACTCD');
      expect(detail.budgetCategoryOptionsForForm).toEqual([{ id: 'ACTCD', text: 'R01' }]);
      expect(detail.data.justificationText).toBe('current B');
      expect(fundingSubmissionsServiceSpy.getBudgetCategoryOptions.calls.allArgs()).toEqual([[100], [200]]);
      hostFixture.destroy();
    }));

    it('does not request a new grant against the old list when both bound inputs change', fakeAsync(() => {
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));
      fundingSubmissionsServiceSpy.getBudgetCategoryOptions.and.returnValue(of([{ code: 'ACTCD', name: 'R01' }]));
      const hostFixture = TestBed.createComponent(BoundGrantDetailHost);
      hostFixture.componentInstance.grant = { applId: 100, budgetCategoryCode: 'ACTCD' };
      hostFixture.detectChanges();
      flushMicrotasks();
      const priorCalls = fundingSubmissionsServiceSpy.getJustification.calls.count();

      hostFixture.componentInstance.grant = { applId: 200, budgetCategoryCode: 'ACTCD' };
      hostFixture.componentInstance.listId = 2;
      hostFixture.detectChanges();
      flushMicrotasks();

      expect(fundingSubmissionsServiceSpy.getJustification.calls.allArgs().slice(priorCalls)).toEqual([[2, 200]]);
      hostFixture.destroy();
    }));

    it('saves the selected code and uses an independent server readback for the display label', fakeAsync(() => {
      const stored = {
        applId: 100, grantNumber: '1R01CA123456-01', docDecision: 'Pay', docPriority: 1,
        docRecommendedAmount: 90000, docRecommendedReductionPct: 10, originalRequestedTotal: 100000,
        budgetCategoryCode: 'RFA', budgetCategories: 'RFA', docNciSelection: 'DOC',
        annualFundingR01: 'No', annualOrMyf: 'MYF', docNotes: '', oefiaNotes: '', justificationText: ''
      };
      component.data = stored;
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getBudgetCategoriesSubject.next([{ code: 'RFA', name: 'RFA' }, { code: 'ACTCD', name: 'P01' }]);
      flushMicrotasks();
      component.onEdit();
      component.onUserSelectChange('budgetCategories', 'ACTCD');
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({ grants: [
        { ...stored, budgetCategoryCode: 'ACTCD', budgetCategories: 'P01' }
      ] }));

      component.onSave();
      flushMicrotasks();

      const payload = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0];
      expect(payload.applIds).toEqual([100]);
      expect(payload.fields.budgetCategories).toBe('ACTCD');
      expect(component.data.budgetCategoryCode).toBe('ACTCD');
      expect(component.data.budgetCategories).toBe('P01');
      expect(component.budgetCategoriesDisplay).toBe('P01');
    }));

    it('saves unrelated edits with the existing code while options are still pending', fakeAsync(() => {
      const stored = {
        applId: 100, grantNumber: '1R01CA123456-01', docDecision: 'Pay', docPriority: 1,
        docRecommendedAmount: 90000, docRecommendedReductionPct: 10, originalRequestedTotal: 100000,
        budgetCategoryCode: 'ACTCD', budgetCategories: 'P01', docNciSelection: 'DOC',
        annualFundingR01: 'No', annualOrMyf: 'MYF', docNotes: '', oefiaNotes: '', justificationText: ''
      };
      component.data = stored;
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();
      component.formModel.docNotes = 'Unrelated change';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({ grants: [
        { ...stored, docNotes: 'Unrelated change', budgetCategoryCode: 'ACTCD', budgetCategories: 'P01' }
      ] }));

      component.onSave();
      flushMicrotasks();

      const payload = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0];
      expect(payload.fields.budgetCategories).toBe('ACTCD');
      expect(payload.fields.docNotes).toBe('Unrelated change');
      expect(component.data.budgetCategoryCode).toBe('ACTCD');
      expect(component.data.budgetCategories).toBe('P01');
    }));

    it('does not reinterpret an unresolved stored code that matches the activity option name', fakeAsync(() => {
      const stored = {
        applId: 100, grantNumber: '1R01CA123456-01', docDecision: 'Pay', docPriority: 1,
        docRecommendedAmount: 90000, docRecommendedReductionPct: 10, originalRequestedTotal: 100000,
        budgetCategoryCode: 'R01', budgetCategories: 'Legacy server label', docNciSelection: 'DOC',
        annualFundingR01: 'No', annualOrMyf: 'MYF', docNotes: '', oefiaNotes: '', justificationText: ''
      };
      component.data = stored;
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getBudgetCategoriesSubject.next([{ code: 'ACTCD', name: 'R01' }]);
      flushMicrotasks();
      component.onEdit();
      expect(component.budgetCategoryOptionsForForm).toEqual([
        { id: 'ACTCD', text: 'R01' }, { id: 'R01', text: 'R01 (unresolved)' }
      ]);
      component.formModel.docNotes = 'Unrelated change';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
      fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({ grants: [
        { ...stored, docNotes: 'Unrelated change', budgetCategoryCode: 'R01' }
      ] }));

      component.onSave();
      flushMicrotasks();

      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args[0].fields.budgetCategories)
        .toBe('R01');
      expect(component.data.budgetCategoryCode).toBe('R01');
    }));

    it('does not let late options or DOC Pay defaults override a real category selection', fakeAsync(() => {
      const defaults = new Subject<FundingSubmissionDocPayDefaultsDto[]>();
      fundingSubmissionsServiceSpy.getDocPayDefaults.and.returnValue(defaults);
      component.data = {
        applId: 100, grantNumber: '1R01CA123456-01', docDecision: 'Do Not Pay', addedByGroup: 'OEFIA',
        budgetCategoryCode: null, docNciSelection: null, annualFundingR01: null, annualOrMyf: null,
        docPriority: null, docRecommendedAmount: null, docRecommendedReductionPct: null,
        originalRequestedTotal: 100000, docNotes: 'stored', oefiaNotes: '', justificationText: ''
      };
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      component.onEdit();
      component.onUserSelectChange('docDecision', 'Pay');
      component.onUserSelectChange('budgetCategories', 'ACTCD');
      getBudgetCategoriesSubject.next([{ code: 'ACTCD', name: 'P01' }, { code: 'R01R37', name: 'R01/R37' }]);
      defaults.next([{
        applId: 100, transitionEligible: true, budgetCategories: 'R01R37', budgetCategoriesName: 'R01/R37',
        docNciSelection: 'DOC', annualFundingR01: 'No', annualOrMyf: 'MYF', docPriority: '1',
        docRecAmt: 90000, docRecReductionPct: 10
      }]);
      flushMicrotasks();

      expect(component.formModel.budgetCategories).toBe('ACTCD');
      expect(component.formModel.docNciSelection).toBe('DOC');
      expect(component.budgetCategoryOptionsForForm[0].text).toBe('P01');
    }));
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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

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

    [
      ['GRANT_NOT_ACTIVE', 'Grant membership is no longer active and cannot be changed.'],
      ['GRANT_LOCKED', 'This grant is decision-locked and cannot be changed.'],
      ['DOC_STAGE_READ_ONLY', 'DOC grants in OEFIA Review or NCI Director Review are view-only.']
    ].forEach(([reasonCode, message]) => {
      it(`shows the safe server message for ${reasonCode}`, () => {
        component.justificationLoaded = true;
        component.budgetCategoriesLoaded = true;
        component.data.justificationText = '';
        component.onEdit();
        component.formModel.justificationText = 'pending text';
        const transportText = 'Http failure response for https://api.example.test/private: 409 Conflict';
        fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(throwError(() => ({
          status: 409,
          message: transportText,
          url: 'https://api.example.test/private',
          error: {
            errorCode: '409',
            errorMessage: message,
            additionalData: { reasonCode }
          }
        })));
        fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));

        component.onSave();
        fixture.detectChanges();

        expect(component.justificationSaveError).toBe(message);
        expect(component.isSaveInProgress()).toBeFalse();
        expect(component.isEditMode).toBeTrue();
        expect(component.formModel.justificationText).toBe('pending text');
        const alertText = fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim();
        expect(alertText).toBe(message);
        expect(alertText).not.toContain(transportText);
      });
    });

    it('uses a safe fallback for unknown or malformed 409 payloads', () => {
      component.justificationLoaded = true;
      component.budgetCategoriesLoaded = true;
      component.data.justificationText = '';
      component.onEdit();
      component.formModel.justificationText = 'pending text';
      const unsafeTransportText = 'Http failure response for https://api.example.test/private: 409 Conflict';
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValue(throwError(() => ({
        status: 409,
        message: unsafeTransportText,
        url: 'https://api.example.test/private',
        error: {
          errorMessage: 'Exception: private stack and payload',
          additionalData: { reasonCode: 'UNRECOGNIZED' }
        }
      })));
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({ justificationText: '' } as any));

      component.onSave();
      fixture.detectChanges();

      expect(component.justificationSaveError)
        .toBe('The justification could not be saved because its status changed. Refresh and try again.');
      const alertText = fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim();
      expect(alertText).toBe(component.justificationSaveError);
      expect(alertText).not.toContain('api.example.test');
      expect(alertText).not.toContain('private stack');
      expect(alertText).not.toContain('409 Conflict');
    });

    it('keeps only the unsaved files after a later sequential upload receives 409', () => {
      const firstFile = new File(['first'], 'first.pdf', { type: 'application/pdf' });
      const remainingFile = new File(['second'], 'remaining.pdf', { type: 'application/pdf' });
      component.justificationLoaded = true;
      component.budgetCategoriesLoaded = true;
      component.data.justificationText = 'previous text';
      component.justificationDocuments = [{ id: 88, docFilename: 'removed.pdf' } as any];
      component.onEdit();
      component.formModel.justificationText = '';
      component.justificationFiles = [firstFile, remainingFile];
      component.stagedDeleteDocumentIds = [88];

      const conflict = {
        status: 409,
        message: 'Http failure response for https://api.example.test: 409 Conflict',
        error: {
          errorCode: '409',
          errorMessage: 'The grant is locked.',
          additionalData: { reasonCode: 'GRANT_LOCKED' }
        }
      };
      fundingSubmissionsServiceSpy.saveJustificationForm.and.returnValues(
        of({ id: 99, docFilename: 'first.pdf' } as any),
        throwError(() => conflict)
      );
      fundingSubmissionsServiceSpy.getJustification.and.returnValue(of({
        justificationText: '',
        documents: [{ id: 99, docFilename: 'first.pdf' }]
      } as any));

      component.onSave();
      fixture.detectChanges();

      expect(fundingSubmissionsServiceSpy.saveJustificationForm).toHaveBeenCalledTimes(2);
      expect(fundingSubmissionsServiceSpy.saveJustificationForm.calls.argsFor(0))
        .toEqual([1, 100, firstFile, '', [88]]);
      expect(fundingSubmissionsServiceSpy.saveJustificationForm.calls.argsFor(1))
        .toEqual([1, 100, remainingFile, undefined, undefined]);
      expect(component.justificationFiles).toEqual([remainingFile]);
      expect(component.justificationUploadLabelText).toBe('remaining.pdf');
      expect(component.visiblePersistedDocuments.map(document => document.id)).toEqual([99]);
      expect(component.stagedDeleteDocumentIds).toEqual([]);
      expect(component.data.justificationText).toBe('');
      expect(component.formModel.justificationText).toBe('');
      expect(component.hasUnsavedChanges()).toBeTrue();
      expect(component.isEditMode).toBeTrue();
      expect(component.isSaveInProgress()).toBeFalse();
      expect(component.justificationSaveError).toBe('The grant is locked.');
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim())
        .toBe('The grant is locked.');
    });

    it('clears a displayed justification save error when the user changes the justification input', () => {
      component.justificationSaveError = 'Previous save error';

      component.onNotesModelChange();

      expect(component.justificationSaveError).toBeNull();
    });

    it('applyFormModelToData() resolves and writes both budgetCategories (NAME) and budgetCategoryCode (CODE)', () => {
      component.onEdit();
      component.formModel.budgetCategories = 'OTHER';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      component.onSave();

      expect(component.data.budgetCategoryCode).toBe('OTHER');
      expect(component.data.budgetCategories).toBe('Other Category');
    });

    it('applyFormModelToData() gracefully clears both budget category fields when the selection has no matching option', () => {
      component.onEdit();
      component.formModel.budgetCategories = null;
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      expect(() => component.onSave()).not.toThrow();

      expect(component.data.budgetCategories).toBeNull();
    });

    it('writes twoYearAnnualFundingR01Flag as a real boolean true when "Yes" is selected', () => {
      component.onEdit();
      component.formModel.annualFundingR01 = 'Yes';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      component.onSave();

      expect(component.data.twoYearAnnualFundingR01Flag).toBe(true);
    });

    it('writes twoYearAnnualFundingR01Flag as a real boolean false (not a truthy string) when "No" is selected', () => {
      component.data.twoYearAnnualFundingR01Flag = true;
      component.onEdit();
      component.formModel.annualFundingR01 = 'No';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      component.onSave();

      expect(component.data.twoYearAnnualFundingR01Flag).toBe(false);
    });

    it('hydrates raw annual R01 values, including explicit No and legacy null', () => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      component.docFundingListCor = false;
      component.listStatus = 'DOC Review';
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        annualFundingR01: 'No',
        twoYearAnnualFundingR01Flag: false
      };

      component.onEdit();
      expect(component.formModel.annualFundingR01).toBe('No');

      component.data.annualFundingR01 = null;
      component.onEdit();
      expect(component.formModel.annualFundingR01).toBeNull();

      component.data.annualFundingR01 = undefined;
      component.data.twoYearAnnualFundingR01Flag = true;
      component.onEdit();
      expect(component.formModel.annualFundingR01).toBe('Yes');

      component.data.twoYearAnnualFundingR01Flag = false;
      component.onEdit();
      expect(component.formModel.annualFundingR01).toBeNull();
    });

    it('round-trips an unchanged explicit No to the service and in-memory grant after save', () => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      component.docFundingListCor = false;
      component.listStatus = 'DOC Review';
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        docDecision: 'Pay',
        docPriority: 3,
        docRecommendedAmount: 75000,
        docRecommendedReductionPct: 10,
        annualFundingR01: 'No',
        twoYearAnnualFundingR01Flag: false,
        budgetCategoryCode: 'ESIR37T4',
        docNciSelection: 'DOC',
        annualOrMyf: 'MYF',
        docNotes: ''
      };
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      component.onEdit();
      component.formModel.docNotes = 'Updated notes';
      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.annualFundingR01).toBe('No');
      expect(component.data.annualFundingR01).toBe('No');
      expect(component.data.twoYearAnnualFundingR01Flag).toBeFalse();
      expect(component.isEditMode).toBeFalse();
      const element: HTMLElement = fixture.nativeElement;
      const label = Array.from(element.querySelectorAll('td.grid-label'))
        .find(cell => cell.textContent.trim() === '2Y Annual Fnd R01:');
      expect(label.nextElementSibling.textContent.trim()).toBe('No');

      component.onEdit();
      expect(component.formModel.annualFundingR01).toBe('No');
    });

    it('preserves legacy null without claiming a successful save when the service rejects the required field', () => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      component.docFundingListCor = false;
      component.listStatus = 'DOC Review';
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        docDecision: 'Pay',
        docPriority: 3,
        docRecommendedAmount: 75000,
        docRecommendedReductionPct: 10,
        annualFundingR01: null,
        twoYearAnnualFundingR01Flag: false,
        budgetCategoryCode: 'ESIR37T4',
        docNciSelection: 'DOC',
        annualOrMyf: 'MYF',
        docNotes: ''
      };
      const message = 'Two-Year Annual Funding R01 (HRHR) is required.';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(throwError(() => ({
        status: 400,
        error: { errorMessage: message }
      })));
      spyOn(component.saved, 'emit');

      component.onEdit();
      component.formModel.docNotes = 'Updated notes';
      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.annualFundingR01).toBeNull();
      expect(component.data.annualFundingR01).toBeNull();
      expect(component.data.twoYearAnnualFundingR01Flag).toBeFalse();
      expect(component.isEditMode).toBeTrue();
      expect(component.formModel.annualFundingR01).toBeNull();
      expect(component.fundingSaveError).toBe(message);
      expect(component.saveSuccessMessage).toBe('');
      expect(component.saved.emit).not.toHaveBeenCalled();
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

      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
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
      expect(component.data.annualFundingR01).toBeNull();
      expect(component.data.twoYearAnnualFundingR01Flag).toBeFalse();
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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      // Simulate saving after only a different field was touched — DOC/NCI Selection and
      // Annual/MYF themselves are left untouched, exactly the "unedited save" scenario the fix
      // protects against: the CODE seeded in onEdit() must still flow through, not a NAME.
      component.formModel.docDecision = 'Pay';

      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docNciSelection).toBe('NCI');
      expect(payload.fields.annualOrMyf).toBe('MYF');
    });

    it('onSave() normalizes display-text DOC Decision to the option CODE in payload', () => {
      component.onEdit();
      (component as any).decisionOptions = [
        { id: 'DNP', text: 'Do Not Pay' },
        { id: 'PAY', text: 'Pay' }
      ];
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      component.formModel.docDecision = 'Do Not Pay';
      component.formModel.docNotes = 'reason entered';

      component.onSave();

      const [payload] = fundingSubmissionsServiceSpy.bulkUpdateListGrants.calls.mostRecent().args;
      expect(payload.fields.docDecision).toBe('DNP');
    });

    it('applyFormModelToData() resolves and writes both docNciSelectionName and annualOrMyfName from the selected CODEs', () => {
      component.onEdit();
      component.formModel.docNciSelection = 'DOC';
      component.formModel.annualOrMyf = 'AF';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      expect(() => component.onSave()).not.toThrow();

      expect(component.data.docNciSelectionName).toBeNull();
      expect(component.data.annualOrMyfName).toBeNull();
    });

    it('applyFormModelToData() gracefully clears both NAME fields when the selection is cleared (null)', () => {
      component.onEdit();
      component.formModel.docNciSelection = null;
      component.formModel.annualOrMyf = null;
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));
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

    it('blocks Do Not Pay for a DOC-added grant without clearing dependent fields', () => {
      component.data.addedByGroup = 'DOC';
      component.onEdit();
      component.formModel.docDecision = 'DNP';
      component.formModel.docRecAmt = 100;
      component.formModel.docNotes = '   ';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

      component.onSave();

      expect(component.saveValidationError).toBe('Do Not Pay is not available for grants added by a DOC user.');
      expect(component.formModel.docRecAmt).toBe(100);
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      expect(fundingSubmissionsServiceSpy.saveJustificationForm).not.toHaveBeenCalled();
    });

    it('keeps Do Not Pay visible but disabled for DOC-added grants without mutating lookup options', () => {
      component.data.addedByGroup = ' doc ';
      component.onEdit();

      expect(component.isEditMode).toBeTrue();
      expect(component.docDecisionOptions).toContain(jasmine.objectContaining({ id: 'DNP', text: 'Do Not Pay', disabled: true }));
      expect(component.docDecisionOptions.find(option => option.id === 'Pay')?.disabled).toBeFalsy();
      expect(component.decisionOptions.find(option => option.id === 'DNP')?.disabled).toBeFalsy();
    });

    for (const addedByGroup of ['OEFIA', null, undefined]) {
      it(`leaves Do Not Pay enabled for non-DOC provenance ${addedByGroup}`, () => {
        component.data.addedByGroup = addedByGroup;
        component.onEdit();

        expect(component.docDecisionOptions.find(option => option.id === 'DNP')?.disabled).toBeFalsy();
        component.formModel.docDecision = 'DNP';
        component.onDocDecisionChange();
        expect(component.formModel.docDecision).toBe('DNP');
        expect(component.saveValidationErrors.docDecision).toBeUndefined();
      });
    }

    it('preserves other option restrictions and non-DOC user behavior', () => {
      component.data.addedByGroup = 'DOC';
      component.decisionOptions[0].disabled = true;
      expect(component.docDecisionOptions[0].disabled).toBeTrue();

      component.docFundingListCor = false;
      component.OEFIACertifier = true;
      expect(component.docDecisionOptions.find(option => option.id === 'DNP')?.disabled).toBeFalsy();
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
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of(1));

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

  describe('Individual Edit mandatory fields', () => {
    beforeEach(() => {
      fixture.detectChanges();
      getJustificationSubject.next({ justificationText: '' });
      getJustificationSubject.complete();
      component.onEdit();
    });

    it('disables Save for blank fields without showing untouched required messages', () => {
      fixture.detectChanges();

      expect(component.hasSaveValidationErrors).toBeTrue();
      expect(component.saveValidationErrors).toEqual({});
      expect(fixture.nativeElement.querySelector('button.btn-primary').disabled).toBeTrue();
    });

    for (const { name, label } of [
      { name: 'docRecReductionPct', label: 'DOC Rec % Red' },
      { name: 'docRecAmt', label: 'DOC Rec $' },
      { name: 'docPriority', label: 'DOC Priority' }
    ]) {
      it(`shows ${label} required immediately when cleared without blur`, async () => {
        component.formModel = { docRecReductionPct: 10, docRecAmt: 100, docPriority: '1' };
        fixture.detectChanges();
        await fixture.whenStable();

        const input: HTMLInputElement = fixture.nativeElement.querySelector(`input[name="${name}"]`);
        input.value = '';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(input.previousElementSibling?.textContent?.trim()).toBe(`${label} is required`);
        expect(component.hasSaveValidationErrors).toBeTrue();

        input.value = '1';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(component.saveValidationErrors[name]).toBeUndefined();
        expect(component.hasSaveValidationErrors).toBeFalse();
      });
    }

    it('shows each required message above its field after blur even without a value change', () => {
      const fields = [
        { name: 'docRecReductionPct', label: 'DOC Rec % Red' },
        { name: 'docRecAmt', label: 'DOC Rec $' },
        { name: 'docPriority', label: 'DOC Priority' }
      ];
      fixture.detectChanges();

      fields.forEach(({ name, label }, index) => {
        const input: HTMLInputElement = fixture.nativeElement.querySelector(`input[name="${name}"]`);
        input.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(input.previousElementSibling?.textContent?.trim()).toBe(`${label} is required`);
        expect(Object.keys(component.saveValidationErrors).length).toBe(index + 1);
      });
    });

    it('shows the exact tooltip on hover over disabled Save', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      const saveButton: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-primary');
      expect(saveButton.disabled).toBeTrue();
      expect(saveButton.style.pointerEvents).toBe('none');
      saveButton.parentElement.dispatchEvent(new Event('mouseenter'));
      tick(500);
      fixture.detectChanges();
      expect(document.querySelector('ngb-tooltip-window')?.textContent?.trim())
        .toBe('Complete all required fields before saving.');
      saveButton.parentElement.dispatchEvent(new Event('mouseleave'));
      tick(500);
    }));

    for (const role of ['DOC', 'OEFIA']) {
      for (const field of ['docRecReductionPct', 'docRecAmt', 'docPriority']) {
        it(`blocks ${role} Save when only ${field} is blank`, () => {
          component.docFundingListCor = role === 'DOC';
          component.OEFIACertifier = role === 'OEFIA';
          component.formModel = { docRecReductionPct: 0, docRecAmt: 100, docPriority: '0' };
          component.formModel[field] = null;
          fixture.detectChanges();

          expect(component.canEnterEditMode).toBeTrue();
          expect(fixture.nativeElement.querySelector('button.btn-primary').disabled).toBeTrue();
          component.onSave();
          expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
          expect(fundingSubmissionsServiceSpy.saveJustificationForm).not.toHaveBeenCalled();
        });
      }
    }

    it('clears corrected messages and enables Save for valid values including zero', () => {
      component.onRequiredFieldBlur('docRecReductionPct');
      component.onRequiredFieldBlur('docRecAmt');
      component.onRequiredFieldBlur('docPriority');
      component.formModel.docRecReductionPct = 0;
      component.formModel.docRecAmt = 100;
      component.onDocRecReductionPctChange();

      expect(component.saveValidationErrors.docRecReductionPct).toBeUndefined();
      expect(component.saveValidationErrors.docRecAmt).toBeUndefined();
      expect(component.hasSaveValidationErrors).toBeTrue();

      component.formModel.docPriority = '0';
      component.onValidationFieldChange();
      fixture.detectChanges();

      expect(component.saveValidationErrors).toEqual({});
      expect(component.hasSaveValidationErrors).toBeFalse();
      expect(fixture.nativeElement.querySelector('button.btn-primary').disabled).toBeFalse();
    });

    it('keeps Save disabled for invalid numeric values and blocks direct saves with blanks', () => {
      component.onSave();
      expect(fundingSubmissionsServiceSpy.bulkUpdateListGrants).not.toHaveBeenCalled();
      expect(fundingSubmissionsServiceSpy.saveJustificationForm).not.toHaveBeenCalled();

      for (const invalidFields of [
        { docRecReductionPct: 100 },
        { docRecReductionPct: 1.234 },
        { docRecAmt: -1 },
        { docRecAmt: 1.5 },
        { docPriority: '-1' },
        { docPriority: '1.5' }
      ]) {
        component.formModel = { docRecReductionPct: 0, docRecAmt: 100, docPriority: '0', ...invalidFields };
        expect(component.hasSaveValidationErrors).toBeTrue();
      }
    });

    it('respects Do Not Pay notes validation instead of requiring cleared funding fields', () => {
      component.formModel.docDecision = 'Do Not Pay';
      component.onDocDecisionChange();
      expect(component.hasSaveValidationErrors).toBeTrue();

      component.formModel.docNotes = 'Not recommended';
      component.onNotesModelChange();
      expect(component.hasSaveValidationErrors).toBeFalse();
    });

    it('applies mandatory validation to authorized OEFIA users and other validation errors', () => {
      component.docFundingListCor = false;
      component.OEFIACertifier = true;
      expect(component.hasSaveValidationErrors).toBeTrue();

      component.formModel = { docRecReductionPct: 0, docRecAmt: 100, docPriority: '0' };
      expect(component.hasSaveValidationErrors).toBeFalse();
      component.justificationFileError = 'Unsupported file type.';
      expect(component.hasSaveValidationErrors).toBeTrue();
    });
  });

  describe('FS-2248 DOC reduction calculations', () => {
    beforeEach(() => {
      component.data = {
        applId: 100,
        grantNumber: '1R01CA123456-01',
        originalRequestedTotal: 100000
      };
      component.formModel = {};
    });

    it('calculates DOC Rec $ from the original requested total and preserves the typed percentage', () => {
      component.formModel.docRecReductionPct = 10;

      component.onDocRecReductionPctChange();

      expect(component.formModel.docRecAmt).toBe(90000);
      expect(component.formModel.docRecReductionPct).toBe(10);
    });

    it('calculates DOC Rec $ at zero and maximum valid reduction percentages', () => {
      component.formModel.docRecReductionPct = 0;
      component.onDocRecReductionPctChange();
      expect(component.formModel.docRecAmt).toBe(100000);

      component.formModel.docRecReductionPct = 99.99;
      component.onDocRecReductionPctChange();
      expect(component.formModel.docRecAmt).toBe(10);
    });

    it('uses the original requested total rather than the stored DOC pair as the calculation base', () => {
      component.data.docRecommendedAmount = 83000;
      component.data.docRecommendedReductionPct = 17;
      component.formModel.docRecAmt = 83000;
      component.formModel.docRecReductionPct = 10;

      component.onDocRecReductionPctChange();

      expect(component.formModel.docRecAmt).toBe(90000);
      expect(component.formModel.docRecReductionPct).toBe(10);
    });

    it('rounds exact DOC Rec $ half-dollar ties HALF_UP', () => {
      component.data.originalRequestedTotal = 1001;
      component.formModel.docRecReductionPct = 50;
      component.onDocRecReductionPctChange();
      expect(component.formModel.docRecAmt).toBe(501);
    });

    it('rounds year-one DOC amounts to whole dollars', () => {
      component.data.originalRequestedTotal = 590210;
      component.formModel.docRecReductionPct = 10;
      component.onDocRecReductionPctChange();
      expect(component.formModel.docRecAmt).toBe(531189);

      component.data.originalRequestedTotal = 343125;
      component.formModel.docRecReductionPct = 17;
      component.onDocRecReductionPctChange();
      expect(component.formModel.docRecAmt).toBe(284794);
    });

    it('calculates DOC Rec % from DOC Rec $ and preserves the typed amount', () => {
      component.formModel.docRecAmt = 90000;

      component.onDocRecAmtChange();

      expect(component.formModel.docRecReductionPct).toBe(10);
      expect(component.formModel.docRecAmt).toBe(90000);
    });

    it('calculates zero reduction when DOC Rec $ equals the original requested total', () => {
      component.formModel.docRecAmt = 100000;

      component.onDocRecAmtChange();

      expect(component.formModel.docRecReductionPct).toBe(0);
    });

    it('calculates DOC Rec % to two decimals from a whole-dollar amount', () => {
      component.data.originalRequestedTotal = 343125;
      component.formModel.docRecAmt = 284794;

      component.onDocRecAmtChange();

      expect(component.formModel.docRecReductionPct).toBe(17);
      expect(component.formModel.docRecAmt).toBe(284794);
    });

    it('rejects amounts with cents without calculating a percentage', () => {
      component.isEditMode = true;
      component.formModel.docRecAmt = 531189.50;
      component.formModel.docRecReductionPct = 12;

      component.onDocRecAmtChange();

      expect(component.formModel.docRecReductionPct).toBe(12);
      expect(component.saveValidationErrors.docRecAmt).toBe('DOC Rec $ must be a whole dollar amount.');
    });

    it('does not calculate when the original requested total is null or zero', () => {
      for (const originalRequestedTotal of [null, 0]) {
        component.data.originalRequestedTotal = originalRequestedTotal;
        component.formModel.docRecAmt = 42;
        component.formModel.docRecReductionPct = 10;

        component.onDocRecReductionPctChange();
        expect(component.formModel.docRecAmt).toBe(42);

        component.formModel.docRecReductionPct = 10;
        component.formModel.docRecAmt = 42;
        component.onDocRecAmtChange();
        expect(component.formModel.docRecReductionPct).toBe(10);
      }
    });

    it('does not calculate a percentage for negative or over-precision DOC Rec $ input', () => {
      for (const docRecAmt of [-1, 799.999]) {
        component.formModel.docRecReductionPct = 12;
        component.formModel.docRecAmt = docRecAmt;

        component.onDocRecAmtChange();

        expect(component.formModel.docRecAmt).toBe(docRecAmt);
        expect(component.formModel.docRecReductionPct).toBe(12);
      }
    });

    it('shows the server save error and keeps edited fields open for correction', () => {
      component.justificationLoaded = true;
      component.budgetCategoriesLoaded = true;
      component.onEdit();
      component.formModel.docNotes = 'pending change';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(
        throwError(() => ({ error: { detail: 'DOC reduction pair is inconsistent.' } }))
      );

      component.onSave();
      fixture.detectChanges();

      expect(component.fundingSaveError).toBe('DOC reduction pair is inconsistent.');
      expect(component.isEditMode).toBeTrue();
      expect(component.formModel.docNotes).toBe('pending change');
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim())
        .toBe('DOC reduction pair is inconsistent.');
    });

    it('shows the generic funding save error when the server provides no message', () => {
      component.justificationLoaded = true;
      component.budgetCategoriesLoaded = true;
      component.onEdit();
      component.formModel.docNotes = 'pending change';
      fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(
        throwError(() => ({ status: 500 }))
      );

      component.onSave();
      fixture.detectChanges();

      expect(component.fundingSaveError).toBe('Unable to save the grant changes. Please try again.');
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent.trim())
        .toBe('Unable to save the grant changes. Please try again.');
    });
  });
});
