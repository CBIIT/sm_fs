import { ChangeDetectorRef, Component, forwardRef, getDebugNode, HostBinding, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DataTablesModule } from 'angular-datatables';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { of, Subject } from 'rxjs';

import { AppUserSessionService } from '../../../service/app-user-session.service';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';
import { FUNDING_WRITE_RECOVERY_STORAGE } from '../../funding-write-recovery.service';
import { installDataTables } from '../../testing/install-datatables';
import { MemoryStorage } from '../../testing/memory-storage';
import { UserSelect2ChangeDirective } from '../../user-select2-change.directive';
import { BulkEditComponent } from './bulk-edit.component';

@Component({
  selector: 'ng-select2',
  template: '<span class="selected-label">{{ label }}</span>',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DataTableSelect2Stub), multi: true }]
})
class DataTableSelect2Stub implements ControlValueAccessor {
  @Input() data: Select2OptionData[] = [];
  @Input() id = '';
  @Input() allowClear = false;
  @Input() width = '';
  @HostBinding('attr.data-select-id') get selectId(): string { return this.id; }
  value: string;
  constructor(private cdr: ChangeDetectorRef) {}
  get label(): string { return this.data.find(option => option.id === this.value)?.text ?? ''; }
  writeValue(value: string): void { this.value = value; this.cdr.detectChanges(); }
  registerOnChange(_fn: any): void {}
  registerOnTouched(_fn: any): void {}
  setDisabledState(_disabled: boolean): void {}
}

describe('FS-2533 real Bulk Edit DataTable rendering', () => {
  let fixture: ComponentFixture<BulkEditComponent>;
  let funding: jasmine.SpyObj<FundingSubmissionsService>;
  let first: Subject<any>;
  let second: Subject<any>;
  const jquery = require('jquery');
  const pluginNames = ['dataTable', 'DataTable', 'dataTableSettings', 'dataTableExt'];
  let originalPlugins: Array<PropertyDescriptor | undefined>;
  let originalDollar: any;
  let originalHandlers: Set<any>;

  beforeEach(async () => {
    originalPlugins = pluginNames.map(name => Object.getOwnPropertyDescriptor(jquery.fn, name));
    originalDollar = (window as any).$;
    originalHandlers = new Set((jquery._data(document, 'events')?.['plugin-init'] ?? []).map(entry => entry.handler));
    installDataTables(jquery);
    (window as any).$ = jquery;
    first = new Subject<any>();
    second = new Subject<any>();
    funding = jasmine.createSpyObj('FundingSubmissionsService', [
      'getBudgetCategoryOptions', 'bulkUpdateListGrants', 'getListDetail', 'getDocPayDefaults'
    ]);
    (funding.getBudgetCategoryOptions as jasmine.Spy).and.callFake(applId => applId === 100 ? first : second);
    const dropdowns = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
      'getBudgetCategories', 'getDocDecisions', 'getDocNciSelections', 'getAnnualFundingR01Options', 'getAnnualOrMyfOptions'
    ]);
    dropdowns.getBudgetCategories.and.returnValue(of([
      { id: 'RFA', text: 'RFA' }, { id: 'ACTCD', text: 'Activity Code' }
    ]));
    dropdowns.getDocDecisions.and.returnValue(of([{ id: 'Pay', text: 'Pay' }]));
    dropdowns.getDocNciSelections.and.returnValue(of([{ id: 'DOC', text: 'DOC' }]));
    dropdowns.getAnnualFundingR01Options.and.returnValue(of([{ id: 'No', text: 'No' }]));
    dropdowns.getAnnualOrMyfOptions.and.returnValue(of([{ id: 'MYF', text: 'MYF' }]));
    const user = jasmine.createSpyObj('AppUserSessionService', ['hasRole']);
    user.hasRole.and.returnValue(false);
    const properties = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    properties.getProperty.and.returnValue('http://example/');

    await TestBed.configureTestingModule({
      imports: [FormsModule, NgbTooltipModule, DataTablesModule],
      declarations: [BulkEditComponent, DataTableSelect2Stub, UserSelect2ChangeDirective],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: FundingSubmissionsService, useValue: funding },
        { provide: AppPropertiesService, useValue: properties },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) },
        { provide: FundingSubmDropdownLookupService, useValue: dropdowns },
        { provide: AppUserSessionService, useValue: user },
        { provide: FUNDING_WRITE_RECOVERY_STORAGE, useValue: new MemoryStorage() }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture?.nativeElement.remove();
    const handlers = jquery._data(document, 'events')?.['plugin-init'] ?? [];
    handlers.filter(entry => !originalHandlers.has(entry.handler))
      .forEach(entry => jquery(document).off('plugin-init.dt', entry.handler));
    pluginNames.forEach((name, index) => {
      if (originalPlugins[index]) Object.defineProperty(jquery.fn, name, originalPlugins[index]);
      else delete jquery.fn[name];
    });
    (window as any).$ = originalDollar;
  });

  it('updates the visible page asynchronously and preserves it through Apply, reset and readback', fakeAsync(() => {
    const retry = new Subject<any>();
    let secondAttempts = 0;
    (funding.getBudgetCategoryOptions as jasmine.Spy).and.callFake(applId =>
      applId === 100 ? first : ++secondAttempts === 1 ? second : retry);
    const grants = [100, 200].map((applId, index) => ({
      applId, grantNumber: `GRANT-${index + 1}`, budgetCategoryCode: 'RFA', budgetCategories: 'RFA',
      docDecision: 'Pay', docNciSelection: 'DOC', annualFundingR01: 'No', annualOrMyf: 'MYF',
      docPriority: 1, docRecommendedAmount: 90000, docRecommendedReductionPct: 10,
      docNotes: '', oefiaNotes: '', recusedFlag: false
    }));
    spyOnProperty(history, 'state', 'get').and.returnValue({ listId: 1, grants });
    fixture = TestBed.createComponent(BulkEditComponent);
    document.body.appendChild(fixture.nativeElement);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    fixture.detectChanges();
    const shared = fixture.nativeElement.querySelector('[data-select-id="bulk-budget-cat"]');
    expect((getDebugNode(shared) as any).componentInstance.data).toEqual([
      { id: 'RFA', text: 'RFA' }, { id: 'ACTCD', text: 'Activity Code' }
    ]);
    tick(0);
    flushMicrotasks();
    let dt: DataTables.Api;
    component.dtElement.dtInstance.then(value => dt = value);
    flushMicrotasks();
    dt.page.len(1).draw(false);
    dt.page(1).draw(false);
    fixture.detectChanges();
    tick(0);
    expect(dt.page()).toBe(1);

    component.bulkFields.budgetCategories = 'ACTCD';
    component.onApplyChanges();
    flushMicrotasks();
    tick(0);
    fixture.detectChanges();
    flushMicrotasks();
    expect(dt.page()).toBe(1);
    const displayed = (id: number) =>
      fixture.nativeElement.querySelector(`[data-select-id="bcat-${id}"] .selected-label`)?.textContent?.trim();
    expect(displayed(200)).toBe('ACTCD (unresolved)');
    expect(dt.page()).toBe(1);

    second.error({ status: 500 });
    flushMicrotasks();
    const failedCell = fixture.nativeElement.querySelector('[data-select-id="bcat-200"]').parentElement;
    expect(failedCell.textContent).toContain('could not be loaded');
    expect(displayed(200)).toBe('ACTCD (unresolved)');
    expect(dt.page()).toBe(1);
    (failedCell.querySelector('button') as HTMLButtonElement).click();
    retry.next([{ code: 'RFA', name: 'RFA' }, { code: 'ACTCD', name: 'R01' }]);
    flushMicrotasks();
    expect(displayed(200)).toBe('R01');
    expect(dt.page()).toBe(1);
    expect(component.rows[1].budgetCategories).toBe('ACTCD');
    expect(component.canSave).toBeTrue();

    dt.page(0).draw(false);
    fixture.detectChanges();
    tick(0);
    first.next([{ code: 'RFA', name: 'RFA' }, { code: 'ACTCD', name: 'P01' }]);
    flushMicrotasks();
    expect(displayed(100)).toBe('P01');
    dt.page(1).draw(false);
    fixture.detectChanges();
    tick(0);
    component.onReset();
    flushMicrotasks();
    tick(0);
    fixture.detectChanges();
    flushMicrotasks();
    expect(dt.page()).toBe(1);
    expect(displayed(200)).toBe('RFA');

    component.bulkFields.budgetCategories = 'ACTCD';
    component.onApplyChanges();
    (funding.bulkUpdateListGrants as jasmine.Spy).and.returnValue(of(1));
    (funding.getListDetail as jasmine.Spy).and.returnValue(of({ grants: [
      { ...grants[0], budgetCategoryCode: 'ACTCD', budgetCategories: 'P01' },
      { ...grants[1], budgetCategoryCode: 'ACTCD', budgetCategories: 'R01' }
    ] }));
    component.onSave();
    flushMicrotasks();
    tick(0);
    fixture.detectChanges();
    flushMicrotasks();
    expect(dt.page()).toBe(1);
    expect(displayed(200)).toBe('R01');
    dt.page(0).draw(false);
    fixture.detectChanges();
    tick(0);
    flushMicrotasks();
    expect(displayed(100)).toBe('P01');
    expect(funding.bulkUpdateListGrants.calls.allArgs().map(([body]) => body.fields.budgetCategories))
      .toEqual(['ACTCD', 'ACTCD']);
    expect((funding.getBudgetCategoryOptions as jasmine.Spy).calls.allArgs()).toEqual([[100], [200], [200]]);
    tick(500);
  }));
});
