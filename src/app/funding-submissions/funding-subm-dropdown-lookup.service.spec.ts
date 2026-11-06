import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Select2OptionData } from 'ng-select2';

import { FundingSubmDropdownLookupService } from './funding-subm-dropdown-lookup.service';

describe('FundingSubmDropdownLookupService FS-2679 2Y options', () => {
  let service: FundingSubmDropdownLookupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(FundingSubmDropdownLookupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('exposes Yes and No unchanged to Individual and Bulk Edit through the shared cached lookup', () => {
    let individualOptions: Select2OptionData[];
    let bulkOptions: Select2OptionData[];
    service.getAnnualFundingR01Options().subscribe(options => individualOptions = options);
    service.getAnnualFundingR01Options().subscribe(options => bulkOptions = options);
    http.expectOne('/i2efsws/api/v1/funding-submissions/annual-funding-r01-options').flush([
      { code: 'Yes', name: 'Yes' }, { code: 'No', name: 'No' }
    ]);
    expect(individualOptions).toEqual([{ id: 'Yes', text: 'Yes' }, { id: 'No', text: 'No' }]);
    expect(bulkOptions).toBe(individualOptions);
    service.getAnnualFundingR01Options().subscribe(options => expect(options).toBe(individualOptions));
    http.expectNone('/i2efsws/api/v1/funding-submissions/annual-funding-r01-options');
  });
});
