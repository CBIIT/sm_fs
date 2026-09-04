import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';

import { BulkEditComponent } from './bulk-edit.component';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';

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
      declarations: [BulkEditComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BulkEditComponent);
    component = fixture.componentInstance;
  });

  function seedHistoryStateAndInit(grants: any[]): void {
    spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, selectionDate: '', grants });
    component.ngOnInit();
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

  it('sends a CODE-shaped budgetCategories value (not the free-text NAME) in an unedited row\'s save payload', () => {
    seedHistoryStateAndInit([grant()]);
    fundingSubmissionsServiceSpy.bulkUpdateListGrants.and.returnValue(of({} as any));

    // Unedited save: no dropdown touched by the operator, matching the exact silent-wipe
    // scenario this fix protects against.
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
});
