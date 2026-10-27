import { NgForm } from '@angular/forms';
import { CreateFundingListComponent } from './create-funding-list.component';
import { CreateFundingTableComponent } from './create-funding-table/create-funding-table.component';
import { FundingSubmissionsStateService } from '../funding-submissions-state.service';

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
