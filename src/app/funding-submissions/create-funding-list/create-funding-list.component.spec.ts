import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { AppPropertiesService, PdCaIntegratorService as LibPdCaIntegratorService } from '@cbiit/i2ecui-lib';
import { NGXLogger } from 'ngx-logger';
import { CreateFundingListComponent } from './create-funding-list.component';
import { CreateFundingTableComponent } from './create-funding-table/create-funding-table.component';
import { FundingSubmissionsStateService } from '../funding-submissions-state.service';
import { PdCaIntegratorService } from 'src/app/service/pd-ca-integrator.service';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { GrantNumberSearchModeComponent } from '../../shared/grant-number-search-mode/grant-number-search-mode.component';

function makeGrantNumbers(count: number): string[] {
  return Array.from({ length: count }, (_value, index) => `1R01CA${String(index + 1).padStart(6, '0')}-01`);
}

describe('CreateFundingListComponent grant-number search', () => {
  let stateService: FundingSubmissionsStateService;
  let component: CreateFundingListComponent;
  let fundingTable: jasmine.SpyObj<CreateFundingTableComponent>;

  function createComponent(formValue: any = {}): CreateFundingListComponent {
    component = new CreateFundingListComponent(
      { getProperty: () => '' } as any,
      {} as any,
      {} as any,
      { docEmitter: { next: jasmine.createSpy('docEmitter.next') } } as any,
      { error: jasmine.createSpy('logger.error') } as any,
      stateService
    );

    fundingTable = jasmine.createSpyObj<CreateFundingTableComponent>(
      'CreateFundingTableComponent',
      ['search', 'clearResults', 'restoreState', 'getState']
    );
    component.fundingTable = fundingTable;
    component.filterForm = {
      invalid: false,
      form: {
        value: formValue,
        patchValue: jasmine.createSpy('patchValue'),
        get: jasmine.createSpy('get').and.returnValue({
          setValue: jasmine.createSpy('setValue'),
          reset: jasmine.createSpy('reset')
        })
      }
    } as unknown as NgForm;

    return component;
  }

  beforeEach(() => {
    stateService = new FundingSubmissionsStateService();
  });

  it('sends tokenized full grant numbers only in multiple mode and preserves other criteria', () => {
    createComponent({
      grantNumber: {
        grantNumberType: 'hidden-type',
        grantNumberMech: 'hidden-mech',
        grantNumberIC: 'hidden-ic',
        grantNumberSerial: '123456',
        grantNumberYear: '2025',
        grantNumberSuffix: 'A1'
      },
      typeSelect: [],
      mechSelect: []
    });
    component.grantNumberSearchMode = 'multiple';
    component.multipleGrantNumbers = ' \r\n1R01CA111111-01, 2U01CA222222-02\t\n3P01CA333333-03, ';
    component.searchCriteria = { piName: 'Smith' };
    component.selectedDocs = ['DCP'];

    component.search();

    expect(fundingTable.search).toHaveBeenCalledTimes(1);
    const criteria = fundingTable.search.calls.mostRecent().args[0];
    expect(criteria.fullGrantNumbers).toEqual([
      '1R01CA111111-01',
      '2U01CA222222-02',
      '3P01CA333333-03'
    ]);
    expect(Object.prototype.hasOwnProperty.call(criteria, 'serialNumber')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(criteria, 'grantType')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(criteria, 'grantNumberMech')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(criteria, 'icCode')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(criteria, 'supportYear')).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(criteria, 'suffixCode')).toBeFalse();
    expect(criteria.piName).toBe('Smith');
    expect(criteria.divisionOfficeCenter).toEqual(['DCP']);
  });

  it('does not dispatch multiple mode when separators produce no tokens, even with other criteria', () => {
    createComponent({
      typeSelect: [],
      mechSelect: []
    });
    component.grantNumberSearchMode = 'multiple';
    component.multipleGrantNumbers = ' ,\r\n\t , ';
    component.searchCriteria = { piName: 'Smith' };

    component.search();

    expect(fundingTable.search).not.toHaveBeenCalled();
  });

  it('dispatches 1,000 full grant numbers and rejects 1,001 without truncating', () => {
    createComponent({});
    component.grantNumberSearchMode = 'multiple';
    component.searchCriteria = { piName: 'Smith' };
    const grantNumbers = makeGrantNumbers(1001);
    const validInput = grantNumbers.slice(0, 1000).join('\n');
    component.multipleGrantNumbers = validInput;

    expect(validInput.length).toBeGreaterThan(1000);
    expect(component.hasInvalidMultipleGrantNumbers).toBeFalse();
    component.search();

    expect(fundingTable.search).toHaveBeenCalledTimes(1);
    const validCriteria = fundingTable.search.calls.mostRecent().args[0];
    expect(validCriteria.fullGrantNumbers.length).toBe(1000);
    expect(validCriteria.fullGrantNumbers[999]).toBe(grantNumbers[999]);

    component.multipleGrantNumbers = grantNumbers.join(',');
    expect(component.hasInvalidMultipleGrantNumbers).toBeTrue();
    component.search();

    expect(fundingTable.search).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing single-number mapping and omits the multiple-number field', () => {
    createComponent({
      grantNumber: {
        grantNumberType: 'R01',
        grantNumberMech: '01',
        grantNumberIC: 'CA',
        grantNumberSerial: '123456',
        grantNumberYear: '02',
        grantNumberSuffix: 'S1'
      },
      typeSelect: [],
      mechSelect: []
    });
    component.multipleGrantNumbers = 'ignored multiple text';

    component.search();

    const criteria = fundingTable.search.calls.mostRecent().args[0];
    expect(criteria.grantType).toBe('R01');
    expect(criteria.grantNumberMech).toBe('01');
    expect(criteria.icCode).toBe('CA');
    expect(criteria.serialNumber).toBe('123456');
    expect(criteria.supportYear).toBe('02');
    expect(criteria.suffixCode).toBe('S1');
    expect(Object.prototype.hasOwnProperty.call(criteria, 'fullGrantNumbers')).toBeFalse();
  });

  it('saves and restores multiple mode and text, and reset returns to single mode', () => {
    jasmine.clock().install();
    try {
      createComponent({});
      component.grantNumberSearchMode = 'multiple';
      component.multipleGrantNumbers = '1R01CA111111-01, 2U01CA222222-02';
      fundingTable.getState.and.returnValue({
        selectedRows: new Map(),
        showResults: false,
        currentPage: 0
      } as any);

      component.ngOnDestroy();
      const savedState = stateService.getListPageState();
      expect(savedState.grantNumberSearchMode).toBe('multiple');
      expect(savedState.multipleGrantNumbers).toBe('1R01CA111111-01, 2U01CA222222-02');

      const restoredComponent = createComponent({});
      restoredComponent.ngAfterViewInit();
      jasmine.clock().tick(0);

      expect(restoredComponent.grantNumberSearchMode).toBe('multiple');
      expect(restoredComponent.multipleGrantNumbers).toBe('1R01CA111111-01, 2U01CA222222-02');

      restoredComponent.reset();
      jasmine.clock().tick(0);
      expect(restoredComponent.grantNumberSearchMode).toBe('single');
      expect(restoredComponent.multipleGrantNumbers).toBe('');
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

describe('CreateFundingListComponent grant-number search template', () => {
  let stateService: FundingSubmissionsStateService;
  let fixture: ComponentFixture<CreateFundingListComponent>;

  beforeEach(async () => {
    stateService = new FundingSubmissionsStateService();
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      declarations: [CreateFundingListComponent, GrantNumberSearchModeComponent],
      providers: [
        { provide: AppPropertiesService, useValue: { getProperty: () => '' } },
        {
          provide: LibPdCaIntegratorService,
          useValue: { caForDocEmitter: { next: jasmine.createSpy('caForDocEmitter.next') } }
        },
        {
          provide: AppUserSessionService,
          useValue: { hasRole: () => false, getDocFundingSubmissionCoordinatorDocAbbrevs: () => [] }
        },
        { provide: PdCaIntegratorService, useValue: { docEmitter: { next: jasmine.createSpy('docEmitter.next') } } },
        { provide: NGXLogger, useValue: { error: jasmine.createSpy('logger.error') } },
        { provide: FundingSubmissionsStateService, useValue: stateService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  function render(): ComponentFixture<CreateFundingListComponent> {
    fixture = TestBed.createComponent(CreateFundingListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function selectMultipleMode(): void {
    const radio = fixture.nativeElement.querySelector('#grant-number-search-multiple') as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function enterGrantNumbers(value: string): void {
    const textarea = fixture.nativeElement.querySelector('#multipleGrantNumbers') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders the label, examples, exact help text, counter and associated validation feedback', () => {
    render();
    selectMultipleMode();

    const textarea = fixture.nativeElement.querySelector('#multipleGrantNumbers') as HTMLTextAreaElement;
    expect(fixture.nativeElement.querySelector('label[for="multipleGrantNumbers"]').textContent.trim()).toBe(
      'Grant Numbers'
    );
    expect(textarea.placeholder).toBe('1R01CA111111-01, 2U01CA222222-02');
    expect(textarea.hasAttribute('maxlength')).toBeFalse();
    expect(textarea.getAttribute('aria-describedby')).toContain('multipleGrantNumbersFeedback');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersHelp').textContent.trim()).toBe(
      'Enter or paste Grant Numbers below. Separate them with a comma, a space, or by entering each Grant Number on a new line.'
    );
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('0/1000');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback').textContent.trim()).toBe(
      'At least one Grant Number is required.'
    );
  });

  it('keeps the textarea full-width and validation feedback below it in the flex layout', () => {
    render();
    selectMultipleMode();

    const textarea = fixture.nativeElement.querySelector('#multipleGrantNumbers') as HTMLTextAreaElement;
    const inputWrap = fixture.nativeElement.querySelector('.grant-number-text-input-wrap') as HTMLElement;
    const feedback = fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback') as HTMLElement;
    const label = fixture.nativeElement.querySelector('label[for="multipleGrantNumbers"]') as HTMLElement;
    const textWrap = fixture.nativeElement.querySelector('.grant-number-text-wrap') as HTMLElement;
    const textareaRect = textarea.getBoundingClientRect();
    const inputWrapRect = inputWrap.getBoundingClientRect();
    const feedbackRect = feedback.getBoundingClientRect();

    expect(inputWrap.parentElement).toBe(textWrap);
    expect(inputWrapRect.width).toBeGreaterThan(label.getBoundingClientRect().width);
    expect(textareaRect.width).toBeGreaterThan(label.getBoundingClientRect().width);
    expect(feedback.parentElement).toBe(inputWrap);
    expect(feedbackRect.top).toBeGreaterThanOrEqual(textareaRect.bottom);
  });

  it('counts separated occurrences including duplicates and disables Search for invalid input despite other criteria', () => {
    render();
    fixture.componentInstance.searchCriteria.piName = 'Smith';
    fixture.detectChanges();
    selectMultipleMode();

    const searchButton = fixture.nativeElement.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(searchButton.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback').textContent.trim()).toBe(
      'At least one Grant Number is required.'
    );

    enterGrantNumbers(' ,\r\n \t , ');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('0/1000');
    expect(searchButton.disabled).toBeTrue();

    enterGrantNumbers('1R01CA111111-01');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('1/1000');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback')).toBeNull();
    expect(searchButton.disabled).toBeFalse();

    enterGrantNumbers('1R01CA111111-01, 1R01CA111111-01\r\n2U01CA222222-02');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('3/1000');
    expect(searchButton.disabled).toBeFalse();
  });

  it('ignores over-limit multiple text while single mode is selected', () => {
    render();
    fixture.componentInstance.searchCriteria.piName = 'Smith';
    fixture.componentInstance.multipleGrantNumbers = makeGrantNumbers(1001).join(',');
    fixture.detectChanges();

    expect(fixture.componentInstance.grantNumberSearchMode).toBe('single');
    expect(fixture.componentInstance.hasInvalidMultipleGrantNumbers).toBeFalse();
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbers')).toBeNull();
    expect((fixture.nativeElement.querySelector('button.btn-primary') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('accepts 1,000 entries longer than 1,000 characters and flags 1,001 entries', () => {
    render();
    fixture.componentInstance.searchCriteria.piName = 'Smith';
    fixture.detectChanges();
    selectMultipleMode();

    const grants = makeGrantNumbers(1001);
    const validInput = grants.slice(0, 1000).join('\n');
    expect(validInput.length).toBeGreaterThan(1000);
    enterGrantNumbers(validInput);

    const textarea = fixture.nativeElement.querySelector('#multipleGrantNumbers') as HTMLTextAreaElement;
    const searchButton = fixture.nativeElement.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(textarea.value).toBe(validInput);
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('1000/1000');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback')).toBeNull();
    expect(searchButton.disabled).toBeFalse();

    const invalidInput = grants.join(',');
    enterGrantNumbers(invalidInput);
    expect(textarea.value).toBe(invalidInput);
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('1001/1000');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback').textContent.trim()).toBe(
      'Do not exceed 1,000 Grant Numbers.'
    );
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(searchButton.disabled).toBeTrue();
  });

  it('shows restored over-limit input as invalid and keeps Search disabled', fakeAsync(() => {
    const grants = makeGrantNumbers(1001);
    const restoredInput = grants.join(',');
    stateService.saveListPageState({
      formValue: { piName: 'Smith' },
      selectedCancerActivities: '',
      selectedDocs: [],
      i2Status: '',
      excludeInList: true,
      grantNumberSearchMode: 'multiple',
      multipleGrantNumbers: restoredInput,
      searchCriteria: {},
      selectedRows: new Map(),
      showResults: false,
      currentPage: 0
    });

    fixture = TestBed.createComponent(CreateFundingListComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.grantNumberSearchMode).toBe('multiple');
    expect(fixture.componentInstance.multipleGrantNumbers).toBe(restoredInput);
    expect(fixture.componentInstance.hasAnyCriteria).toBeTrue();
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersCounter').textContent.trim()).toBe('1001/1000');
    expect(fixture.nativeElement.querySelector('#multipleGrantNumbersFeedback').textContent.trim()).toBe(
      'Do not exceed 1,000 Grant Numbers.'
    );
    expect((fixture.nativeElement.querySelector('button.btn-primary') as HTMLButtonElement).disabled).toBeTrue();
  }));
});
