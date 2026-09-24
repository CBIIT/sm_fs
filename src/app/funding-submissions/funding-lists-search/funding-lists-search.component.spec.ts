import { of, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { LoaderService } from '@cbiit/i2ecui-lib';
import { HttpClient } from '@angular/common/http';

import { FundingListsSearchComponent } from './funding-lists-search.component';
import { roleNames } from '../../service/role-names';

describe('FundingListsSearchComponent.formatLastActionDate (FS-2163)', () => {
  function instantiateComponent(): FundingListsSearchComponent {
    return new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
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
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      loaderServiceSpy,
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
  });

  it('POSTs the current criteria with retained columns[]/order[] and export-all overrides, and triggers a download on success', () => {
    const response = new ArrayBuffer(8);
    httpSpy.post.and.returnValue(of(response));
    (component as any).searchCriteria = {
      grantType: 'R01',
      listId: 123,
      listStatus: ['Pending Review'],
      divisionOfficeCenter: ['DOC1']
    };
    (component as any).latestColumns = [{ data: 'code', search: { value: '', regex: false } }];
    (component as any).latestOrder = [{ column: 4, dir: 'asc' }, { column: 1, dir: 'desc' }];

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
        columns: [{ data: 'code', search: { value: '', regex: false } }],
        order: [{ column: 4, dir: 'asc' }, { column: 1, dir: 'desc' }],
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

  it('ajaxCall normalizes and retains the current columns[] and order[] and sends them in the search request', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 0, recordsFiltered: 0, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    const params = {
      draw: 2,
      columns: [
        { data: 'code', search: { value: '', regex: 'true' } },
        { data: 'lastActionDate', search: { value: '', regex: false } }
      ],
      order: [{ column: 1, dir: 'asc' }, { column: 4, dir: 'desc' }],
      start: 0,
      length: 25,
      search: { value: '', regex: false }
    };

    component.ajaxCall(component, params, () => { /* noop */ });

    expect((component as any).latestColumns).toEqual([
      { data: 'code', search: { value: '', regex: true } },
      { data: 'lastActionDate', search: { value: '', regex: false } }
    ]);
    expect((component as any).latestOrder).toEqual([{ column: 1, dir: 'asc' }, { column: 4, dir: 'desc' }]);
    const searchBody = searchLists.calls.mostRecent().args[0] as any;
    expect(searchBody.columns).toEqual((component as any).latestColumns);
    expect(searchBody.order).toEqual((component as any).latestOrder);
  });

  it('does not mutate searchCriteria or the retained columns/order arrays while building the export request', () => {
    const criteria = { grantType: 'R01' };
    const columns = [{ data: 'code', search: { value: '', regex: false } }];
    const order = [{ column: 4, dir: 'desc' }];
    (component as any).searchCriteria = criteria;
    (component as any).latestColumns = columns;
    (component as any).latestOrder = order;
    httpSpy.post.and.returnValue(of(new ArrayBuffer(8)));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(document, 'createElement').and.returnValue({ click: () => {}, download: '', href: '' } as any);

    component.exportListSearchResults();

    expect(criteria).toEqual({ grantType: 'R01' });
    expect((criteria as any).start).toBeUndefined();
    expect((criteria as any).length).toBeUndefined();
    expect(columns).toEqual([{ data: 'code', search: { value: '', regex: false } }]);
    expect(order).toEqual([{ column: 4, dir: 'desc' }]);
  });

  it('hides the loader and logs on export failure', () => {
    const error = new Error('boom');
    httpSpy.post.and.returnValue(throwError(() => error));

    component.exportListSearchResults();

    expect(loaderServiceSpy.show).toHaveBeenCalled();
    expect(loaderServiceSpy.hide).toHaveBeenCalled();
    expect(loggerSpy.error).toHaveBeenCalledWith('List search export failed', error);
  });

  it('sends only pendingReviewOnly for the Pending Review quick filter', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    component.pendingReviewCount = 1;

    component.onPendingReviewClick();
    component.ajaxCall(component, {
      draw: 1,
      columns: [],
      order: [],
      start: 0,
      length: 10,
      search: { value: '', regex: false }
    }, () => { /* noop */ });

    const body = searchLists.calls.mostRecent().args[0] as any;
    expect(body.pendingReviewOnly).toBeTrue();
    expect(body.listStatus).toBeUndefined();
    expect(component.selectedListStatus).toBeNull();
  });

  it('includes pendingReviewOnly in export criteria for pending-review results', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    component.pendingReviewCount = 1;
    component.onPendingReviewClick();
    httpSpy.post.and.returnValue(of(new ArrayBuffer(8)));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(document, 'createElement').and.returnValue({ click: () => {}, download: '', href: '' } as any);

    component.exportListSearchResults();

    expect(httpSpy.post.calls.mostRecent().args[1].pendingReviewOnly).toBeTrue();
    expect(httpSpy.post.calls.mostRecent().args[1].listStatus).toBeUndefined();
  });

  it('deactivates pending review before building a normal filter search', () => {
    (component as any).filterForm = {
      invalid: false,
      form: {
        value: { grantNumber: {}, fyRange: {} }
      }
    };
    component.selectedListStatus = 'Active';
    (component as any).pendingReviewOnly = true;

    component.search();

    expect((component as any).searchCriteria.pendingReviewOnly).toBeUndefined();
    expect((component as any).searchCriteria.listStatus).toEqual(['Active']);
  });

  it('clears pending review state and criteria on reset', async () => {
    (component as any).pendingReviewOnly = true;
    (component as any).searchCriteria = { pendingReviewOnly: true };

    component.reset();
    await Promise.resolve();

    expect((component as any).pendingReviewOnly).toBeFalse();
    expect((component as any).searchCriteria).toEqual({});
  });

  it('defaults a DOC user with pending reviews exactly once when initialization is ready', () => {
    const userSession = (component as any).userSessionService;
    userSession.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);
    component.pendingReviewCount = 2;
    (component as any).pendingReviewCountLoaded = true;
    (component as any).searchListsInitialized = true;

    (component as any).applyDefaultPendingReviewIfReady();
    (component as any).applyDefaultPendingReviewIfReady();

    expect((component as any).searchCriteria).toEqual({ pendingReviewOnly: true });
    expect(component.showResults).toBeTrue();
    expect((component as any).defaultPendingReviewApplied).toBeTrue();
  });

  it('preserves the DOC default across the microtask boundary on fresh navigation', async () => {
    const stateService = (component as any).stateService;
    stateService.consumeFreshNavigationRequest.and.returnValue(true);
    stateService.getSearchListsState.and.returnValue(null);
    (component as any).userSessionService.hasRole.and.returnValue(true);
    (component as any).filterForm = {
      resetForm: jasmine.createSpy('resetForm'),
      form: { value: {} }
    };
    component.pendingReviewCount = 2;
    (component as any).pendingReviewCountLoaded = true;
    spyOn<any>(component, 'triggerTableInit');

    component.ngAfterViewInit();
    expect((component as any).searchCriteria).toEqual({ pendingReviewOnly: true });
    expect(component.showResults).toBeTrue();

    await Promise.resolve();

    expect((component as any).searchCriteria).toEqual({ pendingReviewOnly: true });
    expect(component.showResults).toBeTrue();
  });

  it('does not default a non-DOC user or a user with saved state', () => {
    const userSession = (component as any).userSessionService;
    userSession.hasRole.and.returnValue(false);
    component.pendingReviewCount = 2;
    (component as any).pendingReviewCountLoaded = true;
    (component as any).searchListsInitialized = true;
    (component as any).applyDefaultPendingReviewIfReady();
    expect(component.showResults).toBeFalse();

    userSession.hasRole.and.returnValue(true);
    (component as any).hasSavedSearchListsState = true;
    (component as any).applyDefaultPendingReviewIfReady();
    expect(component.showResults).toBeFalse();
  });

  it('does not send a nihNetworkId for ordinary pending-review searches', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 0, recordsFiltered: 0, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    component.pendingReviewCount = 1;
    component.onPendingReviewClick();
    component.ajaxCall(component, {
      draw: 1, columns: [], order: [], start: 0, length: 10, search: { value: '', regex: false }
    }, () => { /* noop */ });

    expect(searchLists.calls.mostRecent().args[0].nihNetworkId).toBeUndefined();
  });
});

describe('FundingListsSearchComponent list-name labels (FS-2273)', () => {
  it('labels the search results code column as "List Name"', () => {
    const component = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );

    component.ngAfterViewInit();

    expect(component.dtOptions.columns[2].title).toBe('List Name');
    expect(component.dtOptions.columns[2].data).toBe('code');
  });
});
