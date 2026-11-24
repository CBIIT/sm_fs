import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { LoaderService } from '@cbiit/i2ecui-lib';
import { HttpClient } from '@angular/common/http';

import { FundingListsSearchComponent } from './funding-lists-search.component';
import { roleNames } from '../../service/role-names';

declare var $: any;

function initializeWithDataTables(component: FundingListsSearchComponent): void {
  const original = Object.getOwnPropertyDescriptor($.fn, 'DataTable');
  Object.defineProperty($.fn, 'DataTable', {
    configurable: true,
    value: { ext: { pager: { numbers_length: 7 } } }
  });
  try {
    component.ngOnInit();
  } finally {
    if (original) {
      Object.defineProperty($.fn, 'DataTable', original);
    } else {
      delete $.fn.DataTable;
    }
  }
}

describe('FundingListsSearchComponent List ID lookup (FS-2789)', () => {
  let component: FundingListsSearchComponent;
  let http: jasmine.SpyObj<HttpClient>;
  let service: any;
  let logger: jasmine.SpyObj<NGXLogger>;

  beforeEach(() => {
    http = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    http.get.and.returnValue(of([]));
    logger = jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']);
    service = jasmine.createSpyObj('FundingSubmissionsService', [
      'getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount'
    ]);
    service.getSelectionDateCodes.and.returnValue(of([]));
    service.getListStatusCodes.and.returnValue(of([]));
    service.getPendingReviewListCount.and.returnValue(of(0));
    service.searchLists.and.returnValue(of({ recordsTotal: 0, recordsFiltered: 0, data: [] }));
    const userSession = jasmine.createSpyObj('AppUserSessionService', [
      'hasRole', 'getDocFundingSubmissionCoordinatorDocAbbrevs'
    ]);
    userSession.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);
    userSession.getDocFundingSubmissionCoordinatorDocAbbrevs.and.returnValue(['DCB']);
    component = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']), logger, http, service,
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', [
        'consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState'
      ]),
      userSession
    );
  });

  it('GETs and maps all IDs, including 34 and more than 100 options, without searching lists', () => {
    const ids = Array.from({ length: 125 }, (_, i) => i + 1);
    http.get.and.returnValue(of(ids));

    initializeWithDataTables(component);

    expect(http.get).toHaveBeenCalledOnceWith('/i2efsws/api/v1/funding-submissions/lists/ids');
    expect(service.searchLists).not.toHaveBeenCalled();
    expect(component.listIdOptions).toEqual(ids.map(id => ({ id: String(id), text: String(id) })));
    expect(component.listIdOptions[33]).toEqual({ id: '34', text: '34' });
    expect(component.listIdOptions[124]).toEqual({ id: '125', text: '125' });
    expect(component.selectedDocs).toEqual(['DCB']);
  });

  it('leaves options empty when the lookup returns an empty array', () => {
    initializeWithDataTables(component);

    expect(component.listIdOptions).toEqual([]);
    expect(service.searchLists).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs lookup failure and uses an empty array without a fallback search', () => {
    const error = new Error('lookup failed');
    http.get.and.returnValue(throwError(() => error));

    initializeWithDataTables(component);

    expect(logger.error).toHaveBeenCalledWith('Failed to load dropdown options', error);
    expect(component.listIdOptions).toEqual([]);
    expect(service.searchLists).not.toHaveBeenCalled();
  });

  it('keeps the selected List ID and DOC criteria on actual search after lookup initialization', () => {
    http.get.and.returnValue(of([34]));
    initializeWithDataTables(component);
    component.listIdFilter = '34';
    component.selectedListStatus = 'Completed';
    component.filterForm = {
      invalid: false, form: { value: { grantNumber: {}, fyRange: {} } }
    } as any;

    component.search();
    component.ajaxCall(component, {
      draw: 1, columns: [], order: [], start: 0, length: 10, search: { value: '', regex: false }
    }, () => {});

    expect(service.searchLists).toHaveBeenCalledTimes(1);
    expect(service.searchLists.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      listId: 34, divisionOfficeCenter: ['DCB'], listStatus: ['Completed'], start: 0, length: 10
    }));
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});

describe('FundingListsSearchComponent.formatLastActionDate (FS-2163)', () => {
  function instantiateComponent(): FundingListsSearchComponent {
    return new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount', 'getOefiaPendingReviewListCount', 'getNciDirectorPendingReviewListCount']),
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
    httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    httpSpy.get.and.returnValue(of([]));
    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['show', 'hide']);
    loggerSpy = jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']);
    component = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      loggerSpy,
      httpSpy,
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount', 'getOefiaPendingReviewListCount', 'getNciDirectorPendingReviewListCount']),
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

  it('sends pendingReviewOnly and pendingReviewType for the Pending Review quick filter', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    (component as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);
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
    expect(body.pendingReviewType).toBe('DOC');
    expect(body.listStatus).toBeUndefined();
    expect(component.selectedListStatus).toBeNull();
  });

  it('includes pendingReviewOnly in export criteria for pending-review results', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    (component as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);
    component.pendingReviewCount = 1;
    component.onPendingReviewClick();
    httpSpy.post.and.returnValue(of(new ArrayBuffer(8)));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(document, 'createElement').and.returnValue({ click: () => {}, download: '', href: '' } as any);

    component.exportListSearchResults();

    expect(httpSpy.post.calls.mostRecent().args[1].pendingReviewOnly).toBeTrue();
    expect(httpSpy.post.calls.mostRecent().args[1].pendingReviewType).toBe('DOC');
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

    expect((component as any).searchCriteria).toEqual({ pendingReviewOnly: true, pendingReviewType: 'DOC' });
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
    expect((component as any).searchCriteria).toEqual({ pendingReviewOnly: true, pendingReviewType: 'DOC' });
    expect(component.showResults).toBeTrue();

    await Promise.resolve();

    expect((component as any).searchCriteria).toEqual({ pendingReviewOnly: true, pendingReviewType: 'DOC' });
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
    (component as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.DOC_FUNDING_LIST_COR);
    component.pendingReviewCount = 1;
    component.onPendingReviewClick();
    component.ajaxCall(component, {
      draw: 1, columns: [], order: [], start: 0, length: 10, search: { value: '', regex: false }
    }, () => { /* noop */ });

    expect(searchLists.calls.mostRecent().args[0].nihNetworkId).toBeUndefined();
  });

  it('loads OEFIA pending-review count for OEFIA users', () => {
    const fundingSubmissionsService = (component as any).fundingSubmissionsService;
    fundingSubmissionsService.getSelectionDateCodes.and.returnValue(of([]));
    fundingSubmissionsService.searchLists.and.returnValue(of({ data: [] } as any));
    fundingSubmissionsService.getListStatusCodes.and.returnValue(of([]));
    fundingSubmissionsService.getPendingReviewListCount.and.returnValue(of(0));
    fundingSubmissionsService.getOefiaPendingReviewListCount.and.returnValue(of(3));
    fundingSubmissionsService.getNciDirectorPendingReviewListCount.and.returnValue(of(0));

    const userSession = (component as any).userSessionService;
    userSession.hasRole.and.callFake((role: string) => role === roleNames.OEFIA_CERTIFIER);
    userSession.getDocFundingSubmissionCoordinatorDocAbbrevs = jasmine.createSpy('getDocFundingSubmissionCoordinatorDocAbbrevs').and.returnValue([]);

    initializeWithDataTables(component);

    expect(fundingSubmissionsService.getOefiaPendingReviewListCount).toHaveBeenCalled();
    expect(fundingSubmissionsService.getPendingReviewListCount).not.toHaveBeenCalled();
    expect(fundingSubmissionsService.getNciDirectorPendingReviewListCount).not.toHaveBeenCalled();
    expect(component.pendingReviewCount).toBe(3);
  });

  it('loads NCI Director pending-review count for NCI Director users', () => {
    const fundingSubmissionsService = (component as any).fundingSubmissionsService;
    fundingSubmissionsService.getSelectionDateCodes.and.returnValue(of([]));
    fundingSubmissionsService.searchLists.and.returnValue(of({ data: [] } as any));
    fundingSubmissionsService.getListStatusCodes.and.returnValue(of([]));
    fundingSubmissionsService.getPendingReviewListCount.and.returnValue(of(0));
    fundingSubmissionsService.getOefiaPendingReviewListCount.and.returnValue(of(0));
    fundingSubmissionsService.getNciDirectorPendingReviewListCount.and.returnValue(of(5));

    const userSession = (component as any).userSessionService;
    userSession.hasRole.and.callFake((role: string) => role === roleNames.NCI_DIRECTOR);
    userSession.getDocFundingSubmissionCoordinatorDocAbbrevs = jasmine.createSpy('getDocFundingSubmissionCoordinatorDocAbbrevs').and.returnValue([]);

    initializeWithDataTables(component);

    expect(fundingSubmissionsService.getNciDirectorPendingReviewListCount).toHaveBeenCalled();
    expect(fundingSubmissionsService.getPendingReviewListCount).not.toHaveBeenCalled();
    expect(fundingSubmissionsService.getOefiaPendingReviewListCount).not.toHaveBeenCalled();
    expect(component.pendingReviewCount).toBe(5);
  });

  it('uses OEFIA audience pendingReviewType on Pending Review click', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    (component as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.OEFIA_CERTIFIER);
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
    expect(body.pendingReviewType).toBe('OEFIA');
  });

  it('uses OEFIA audience pendingReviewType on Pending Review click for FA users', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    (component as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.FINANCIAL_ANALYST);
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
    expect(body.pendingReviewType).toBe('OEFIA');
  });

  it('uses NCI_DIRECTOR audience pendingReviewType on Pending Review click', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(of({ recordsTotal: 1, recordsFiltered: 1, data: [] }));
    (component as any).fundingSubmissionsService = { searchLists };
    (component as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.NCI_DIRECTOR);
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
    expect(body.pendingReviewType).toBe('NCI_DIRECTOR');
  });

  it('uses the Director-like list route for GM leadership without inheriting the pending-review filter', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const localComponent = new FundingListsSearchComponent(
      router,
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount', 'getOefiaPendingReviewListCount', 'getNciDirectorPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
    (localComponent as any).userSessionService.hasRole.and.callFake(
      (role: string) => role === roleNames.GM_LEADERSHIP
    );
    localComponent.pendingReviewCount = 5;

    localComponent.onPendingReviewClick();
    localComponent.onViewList({ listId: 77, selectionDateName: 'May Selection' });

    expect(localComponent.isOgaLeadershipView).toBeTrue();
    expect((localComponent as any).pendingReviewOnly).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/funding-submissions/funding-lists'], {
      queryParams: { listId: 77, selectionDate: 'May Selection', from: 'lists' }
    });
  });

  it('preserves the existing OEFIA experience when GM leadership is also present', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const localComponent = new FundingListsSearchComponent(
      router,
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount', 'getOefiaPendingReviewListCount', 'getNciDirectorPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
    (localComponent as any).userSessionService.hasRole.and.callFake(
      (role: string) => role === roleNames.GM_LEADERSHIP || role === roleNames.OEFIA_CERTIFIER
    );

    localComponent.onViewList({ listId: 77, selectionDateName: 'May Selection' });

    expect(localComponent.isOgaLeadershipView).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/funding-submissions/search'], jasmine.any(Object));
  });

  it('strips both hidden pending-review fields from GM search and export payloads', () => {
    const searchLists = jasmine.createSpy('searchLists').and.returnValue(
      of({ recordsTotal: 0, recordsFiltered: 0, data: [] })
    );
    (component as any).fundingSubmissionsService = { searchLists };
    (component as any).userSessionService.hasRole.and.callFake(
      (role: string) => role === roleNames.GM_LEADERSHIP
    );
    (component as any).searchCriteria = {
      grantType: 'R01',
      listStatus: ['Pending Review', 'Active'],
      pendingReviewOnly: true,
      pendingReviewType: 'NCI_DIRECTOR'
    };

    component.ajaxCall(component, {
      draw: 1, columns: [], order: [], start: 0, length: 10, search: { value: '', regex: false }
    }, () => { /* noop */ });

    const searchBody = searchLists.calls.mostRecent().args[0] as any;
    expect(searchBody.grantType).toBe('R01');
    expect(searchBody.listStatus).toEqual(['Active']);
    expect(searchBody.pendingReviewOnly).toBeUndefined();
    expect(searchBody.pendingReviewType).toBeUndefined();

    httpSpy.post.and.returnValue(of(new ArrayBuffer(8)));
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
    spyOn(document, 'createElement').and.returnValue({ click: () => {}, download: '', href: '' } as any);
    component.exportListSearchResults();

    const exportBody = httpSpy.post.calls.mostRecent().args[1] as any;
    expect(exportBody.pendingReviewOnly).toBeUndefined();
    expect(exportBody.pendingReviewType).toBeUndefined();
    expect(exportBody.listStatus).toEqual(['Active']);
  });

  it('removes restored pending-review state for GM leadership while retaining other filters', fakeAsync(() => {
    const savedState = {
      searchCriteria: {
        grantType: 'R01',
        listStatus: ['Pending Review', 'Active'],
        pendingReviewOnly: true,
        pendingReviewType: 'NCI_DIRECTOR'
      },
      selectedListStatus: 'Pending Review',
      selectedDocs: [],
      showResults: true,
      formValue: {}
    };
    const stateService = jasmine.createSpyObj('FundingSubmissionsStateService', [
      'consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState'
    ]);
    stateService.consumeFreshNavigationRequest.and.returnValue(false);
    stateService.getSearchListsState.and.returnValue(savedState);
    const localComponent = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount', 'getOefiaPendingReviewListCount', 'getNciDirectorPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      stateService,
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
    (localComponent as any).userSessionService.hasRole.and.callFake(
      (role: string) => role === roleNames.GM_LEADERSHIP
    );

    localComponent.ngAfterViewInit();
    tick(1000);

    expect(localComponent.isOgaLeadershipView).toBeTrue();
    expect(localComponent.selectedListStatus).toBeNull();
    expect((localComponent as any).searchCriteria.grantType).toBe('R01');
    expect((localComponent as any).searchCriteria.listStatus).toEqual(['Active']);
    expect((localComponent as any).searchCriteria.pendingReviewOnly).toBeUndefined();
    expect((localComponent as any).searchCriteria.pendingReviewType).toBeUndefined();
  }));

  it('uses OEFIA pending count endpoint for OEFIA users in ngOnInit', () => {
    const fundingSubmissionsService = jasmine.createSpyObj('FundingSubmissionsService', [
      'getSelectionDateCodes',
      'searchLists',
      'getListStatusCodes',
      'getPendingReviewListCount',
      'getOefiaPendingReviewListCount',
      'getNciDirectorPendingReviewListCount'
    ]);
    fundingSubmissionsService.getSelectionDateCodes.and.returnValue(of([]));
    fundingSubmissionsService.searchLists.and.returnValue(of({ data: [] }));
    fundingSubmissionsService.getListStatusCodes.and.returnValue(of([]));
    fundingSubmissionsService.getOefiaPendingReviewListCount.and.returnValue(of(3));
    fundingSubmissionsService.getPendingReviewListCount.and.returnValue(of(0));
    fundingSubmissionsService.getNciDirectorPendingReviewListCount.and.returnValue(of(0));

    const localComponent = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['get', 'post']),
      fundingSubmissionsService,
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
    (localComponent as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.OEFIA_CERTIFIER);

    (localComponent as any).http.get.and.returnValue(of([]));
    initializeWithDataTables(localComponent);

    expect(fundingSubmissionsService.getOefiaPendingReviewListCount).toHaveBeenCalled();
    expect(fundingSubmissionsService.getPendingReviewListCount).not.toHaveBeenCalled();
    expect(fundingSubmissionsService.getNciDirectorPendingReviewListCount).not.toHaveBeenCalled();
  });

  it('uses OEFIA pending count endpoint for FA users in ngOnInit', () => {
    const fundingSubmissionsService = jasmine.createSpyObj('FundingSubmissionsService', [
      'getSelectionDateCodes',
      'searchLists',
      'getListStatusCodes',
      'getPendingReviewListCount',
      'getOefiaPendingReviewListCount',
      'getNciDirectorPendingReviewListCount'
    ]);
    fundingSubmissionsService.getSelectionDateCodes.and.returnValue(of([]));
    fundingSubmissionsService.searchLists.and.returnValue(of({ data: [] }));
    fundingSubmissionsService.getListStatusCodes.and.returnValue(of([]));
    fundingSubmissionsService.getOefiaPendingReviewListCount.and.returnValue(of(4));
    fundingSubmissionsService.getPendingReviewListCount.and.returnValue(of(0));
    fundingSubmissionsService.getNciDirectorPendingReviewListCount.and.returnValue(of(0));

    const localComponent = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['get', 'post']),
      fundingSubmissionsService,
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
    (localComponent as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.FINANCIAL_ANALYST);

    (localComponent as any).http.get.and.returnValue(of([]));
    initializeWithDataTables(localComponent);

    expect(fundingSubmissionsService.getOefiaPendingReviewListCount).toHaveBeenCalled();
    expect(fundingSubmissionsService.getPendingReviewListCount).not.toHaveBeenCalled();
    expect(fundingSubmissionsService.getNciDirectorPendingReviewListCount).not.toHaveBeenCalled();
  });

  it('uses NCI Director pending count endpoint for NCI Director users in ngOnInit', () => {
    const fundingSubmissionsService = jasmine.createSpyObj('FundingSubmissionsService', [
      'getSelectionDateCodes',
      'searchLists',
      'getListStatusCodes',
      'getPendingReviewListCount',
      'getOefiaPendingReviewListCount',
      'getNciDirectorPendingReviewListCount'
    ]);
    fundingSubmissionsService.getSelectionDateCodes.and.returnValue(of([]));
    fundingSubmissionsService.searchLists.and.returnValue(of({ data: [] }));
    fundingSubmissionsService.getListStatusCodes.and.returnValue(of([]));
    fundingSubmissionsService.getNciDirectorPendingReviewListCount.and.returnValue(of(2));
    fundingSubmissionsService.getPendingReviewListCount.and.returnValue(of(0));
    fundingSubmissionsService.getOefiaPendingReviewListCount.and.returnValue(of(0));

    const localComponent = new FundingListsSearchComponent(
      jasmine.createSpyObj('Router', ['navigate']),
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['get', 'post']),
      fundingSubmissionsService,
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
    (localComponent as any).userSessionService.hasRole.and.callFake((role: string) => role === roleNames.NCI_DIRECTOR);

    (localComponent as any).http.get.and.returnValue(of([]));
    initializeWithDataTables(localComponent);

    expect(fundingSubmissionsService.getNciDirectorPendingReviewListCount).toHaveBeenCalled();
    expect(fundingSubmissionsService.getPendingReviewListCount).not.toHaveBeenCalled();
    expect(fundingSubmissionsService.getOefiaPendingReviewListCount).not.toHaveBeenCalled();
  });
});

describe('FundingListsSearchComponent list-name display', () => {
  function instantiate(router = jasmine.createSpyObj('Router', ['navigate'])): FundingListsSearchComponent {
    return new FundingListsSearchComponent(
      router,
      jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']),
      jasmine.createSpyObj('HttpClient', ['post']),
      jasmine.createSpyObj('FundingSubmissionsService', ['getSelectionDateCodes', 'searchLists', 'getListStatusCodes', 'getPendingReviewListCount', 'getOefiaPendingReviewListCount', 'getNciDirectorPendingReviewListCount']),
      { caForDocEmitter: { next: jasmine.createSpy('next') } } as any,
      jasmine.createSpyObj('LoaderService', ['show', 'hide']),
      jasmine.createSpyObj('FundingSubmissionsStateService', ['consumeFreshNavigationRequest', 'getSearchListsState', 'isFreshNavigationRequested', 'saveSearchListsState']),
      jasmine.createSpyObj('AppUserSessionService', ['hasRole'])
    );
  }

  it('binds the "List Name" column to the list name rather than the code', () => {
    const component = instantiate();

    component.ngAfterViewInit();

    expect(component.dtOptions.columns[2].title).toBe('List Name');
    expect(component.dtOptions.columns[2].data).toBe('selectionDateName');
  });

  it('View List carries the name as presentation text while preserving listId, destination, and from', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const component = instantiate(router);

    component.onViewList({ listId: 77, code: '9-MAY', selectionDateName: 'May 19th Selection' });

    expect(router.navigate).toHaveBeenCalledWith(['/funding-submissions/search'], {
      queryParams: { listId: 77, selectionDate: 'May 19th Selection', from: 'lists' }
    });
  });

  it('fallback View List link recovers the row by DataTables row, keeping a name with quotes and & intact', fakeAsync(() => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const component = instantiate(router);
    spyOn<any>(component, 'realignDataTableColumns').and.stub();
    component.ngAfterViewInit();
    const row = { listId: 88, code: 'Q-AMP', selectionDateName: 'Dr. "Q" & Partners\' List' };
    const html = component.dtOptions.columns[5].render(null, 'display', row);
    expect(html).not.toContain(row.selectionDateName);
    const tbody = $(`<tbody><tr><td>${html}</td></tr></tbody>`);
    const dt = {
      rows: () => ({ count: () => 1 }),
      button: () => ({ enable: () => undefined, disable: () => undefined, node: () => document.createElement('button') }),
      table: () => ({ body: () => tbody[0] }),
      row: (tr: any) => ({ data: () => ($(tr).is(tbody.find('tr')) ? row : undefined) })
    };
    component.dtElement = { dtInstance: Promise.resolve(dt) } as any;

    component.dtOptions.drawCallback();
    tick();
    tbody.find('.view-list-link-fallback').trigger('click');

    expect(router.navigate).toHaveBeenCalledWith(['/funding-submissions/search'], {
      queryParams: { listId: 88, selectionDate: 'Dr. "Q" & Partners\' List', from: 'lists' }
    });
  }));
});
