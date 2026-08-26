import { of, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { LoaderService } from '@cbiit/i2ecui-lib';
import { HttpClient } from '@angular/common/http';

import { FundingListsSearchComponent } from './funding-lists-search.component';

describe('FundingListsSearchComponent.formatLastActionDate (FS-2163)', () => {
  function instantiateComponent(): FundingListsSearchComponent {
    return new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsControllerService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState'])
    );
  }
  it('returns empty string for falsy input', () => {
    expect(FundingListsSearchComponent.formatLastActionDate(null)).toBe('');
    expect(FundingListsSearchComponent.formatLastActionDate(undefined)).toBe('');
    expect(FundingListsSearchComponent.formatLastActionDate('')).toBe('');
  });

  it('formats a date-only string (YYYY-MM-DD) as MM/DD/YYYY without a UTC/local day-boundary shift', () => {
    expect(FundingListsSearchComponent.formatLastActionDate('2026-08-25')).toBe('08/25/2026');
    expect(FundingListsSearchComponent.formatLastActionDate('2026-01-01')).toBe('01/01/2026');
    expect(FundingListsSearchComponent.formatLastActionDate('2026-12-31')).toBe('12/31/2026');
  });

  it('falls back to Date parsing for non date-only strings', () => {
    const result = FundingListsSearchComponent.formatLastActionDate('2026-08-25T14:20:07');
    expect(result).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it('returns the original string when the value cannot be parsed as a date', () => {
    expect(FundingListsSearchComponent.formatLastActionDate('not-a-date')).toBe('not-a-date');
  });
});

describe('FundingListsSearchComponent.exportListSearchResults (FS-2033)', () => {
  let component: FundingListsSearchComponent;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['post']);
    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['show', 'hide']);
    loggerSpy = jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']);
    component = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      loggerSpy,
      httpSpy,
      jasmine.createSpyObj('FundingSubmissionsControllerService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      loaderServiceSpy,
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState'])
    );
  });

  it('POSTs the current criteria with export-all overrides and triggers a download on success', () => {
    const response = new ArrayBuffer(8);
    httpSpy.post.and.returnValue(of(response));
    (component as any).searchCriteria = {
      grantType: 'R01',
      listId: 123,
      listStatus: ['Pending Review'],
      divisionOfficeCenter: ['DOC1']
    };
    (component as any).lastSortOrder = [[1, 'asc']];

    const createObjectUrlSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
    const anchor = { click: jasmine.createSpy('click'), download: '', href: '' } as any;
    const createElementSpy = spyOn(document, 'createElement').and.returnValue(anchor);

    component.exportListSearchResults();

    expect(loaderServiceSpy.show).toHaveBeenCalled();
    expect(httpSpy.post).toHaveBeenCalledWith(
      '/i2efsws/api/v1/funding-submissions/lists/export',
      {
        grantType: 'R01',
        listId: 123,
        listStatus: ['Pending Review'],
        divisionOfficeCenter: ['DOC1'],
        order: [[1, 'asc']],
        start: 0,
        length: -1
      },
      jasmine.objectContaining({ responseType: 'arraybuffer' as any })
    );
    expect(loaderServiceSpy.hide).toHaveBeenCalled();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('funding_submissions_lists_result_all.xls');
    expect(anchor.href).toBe('blob:test');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('hides the loader and logs on export failure', () => {
    const error = new Error('boom');
    httpSpy.post.and.returnValue(throwError(() => error));

    component.exportListSearchResults();

    expect(loaderServiceSpy.show).toHaveBeenCalled();
    expect(loaderServiceSpy.hide).toHaveBeenCalled();
    expect(loggerSpy.error).toHaveBeenCalledWith('List search export failed', error);
  });
});
