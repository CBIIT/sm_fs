import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { HeartbeatService } from '@cbiit/i2ecui-lib';
import { Configuration, FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { NGXLogger } from 'ngx-logger';
import { of, Subject } from 'rxjs';

import { ErrorHandlerService } from '../error/error-handler.service';
import { ErrorInterceptor } from '../interceptors/error-interceptor.service';
import { FundingRequestErrorScopeInterceptor, FundingRequestErrorScopeService } from './funding-request-error-scope.service';
import { GrantBudgetCategoryOptions } from './grant-budget-category-options';

describe('GrantBudgetCategoryOptions', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let scope: FundingRequestErrorScopeService;
  let options: GrantBudgetCategoryOptions;
  let router: jasmine.SpyObj<Router>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  const url = (applId: number) =>
    `/i2efsws/api/v1/funding-submissions/grants/${applId}/budget-category-options`;
  const response = (activity: string) => [
    { code: 'R01R37', name: 'R01/R37', description: 'First category' },
    { code: 'ACTCD', name: activity, description: 'Grant activity' }
  ];

  beforeEach(() => {
    const routerEvents = new Subject<any>();
    router = jasmine.createSpyObj('Router', ['navigate'], { events: routerEvents, url: '/edit' });
    router.navigate.and.returnValue(Promise.resolve(true));
    errorHandler = jasmine.createSpyObj('ErrorHandlerService', ['errorType', 'registerNewError']);
    errorHandler.errorType.and.returnValue('HTTP error');
    const logger = jasmine.createSpyObj<NGXLogger>('NGXLogger', ['debug', 'info', 'error']);
    const heartbeat = jasmine.createSpyObj<HeartbeatService>('HeartbeatService', ['pause', 'continue']);
    const globalErrorInterceptor = new ErrorInterceptor(
      errorHandler, router, { done: true } as unknown as ApplicationInitStatus, logger, heartbeat,
      { inProgress$: of(InteractionStatus.None) } as MsalBroadcastService, false
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: FundingRequestErrorScopeInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useValue: globalErrorInterceptor, multi: true }
      ]
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    scope = TestBed.inject(FundingRequestErrorScopeService);
    const service = new FundingSubmissionsService(http, '/i2efsws', new Configuration());
    options = new GrantBudgetCategoryOptions(service, scope, () => {});
  });

  afterEach(() => {
    options.destroy();
    requests.verify({ ignoreCancelled: true });
  });

  it('bounds and deduplicates requests, scopes later queued failures, and retries each grant independently', () => {
    [1, 2, 3, 4, 5, 6, 1, 5].forEach(id => options.request(id));
    const first = requests.expectOne(url(1));
    const second = requests.expectOne(url(2));
    const third = requests.expectOne(url(3));
    const fourth = requests.expectOne(url(4));
    requests.expectNone(url(5));
    requests.expectNone(url(6));
    expect(scope.active).toBeFalse();

    first.flush(response('P01'));
    const fifth = requests.expectOne(url(5));
    second.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });
    const sixth = requests.expectOne(url(6));
    fifth.flush({ message: 'no activity' }, { status: 500, statusText: 'Server Error' });
    third.flush(response('R01'));
    fourth.flush(response('U01'));
    sixth.flush(response('P30'));

    expect(options.state(2).status).toBe('error');
    expect(options.state(5).status).toBe('error');
    expect(options.optionsFor(1, 'ACTCD')).toEqual([
      { id: 'R01R37', text: 'R01/R37' }, { id: 'ACTCD', text: 'P01' }
    ]);
    expect(options.optionsFor(3, 'ACTCD')[1].text).toBe('R01');
    expect(errorHandler.registerNewError).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    options.request(1);
    options.request(3);
    requests.expectNone(url(1));
    requests.expectNone(url(3));
    options.retry(5);
    requests.expectOne(url(5)).flush(response('R21'));
    expect(options.optionsFor(5, 'ACTCD')[1].text).toBe('R21');
    expect(options.state(2).status).toBe('error');
  });

  it('rejects unusable results and retains an absent selected code until retry succeeds', () => {
    const invalid: any[] = [
      null, [], {}, [{ code: '', name: 'bad' }], [{ code: 'ACTCD', name: ' ' }],
      [{ code: 'ACTCD', name: ' Activity Code ' }], [{ code: 'ACTCD', name: 'ACTIVIY CODE' }]
    ];
    invalid.forEach((value, index) => {
      const id = index + 10;
      options.request(id);
      requests.expectOne(url(id)).flush(value);
      expect(options.state(id).status).toBe('error');
      expect(options.optionsFor(id, 'ACTCD')).toEqual([{ id: 'ACTCD', text: 'ACTCD (unresolved)' }]);
    });
    options.retry(10);
    requests.expectOne(url(10)).flush([{ code: 'RFA', name: 'RFA' }]);
    expect(options.state(10).status).toBe('ready');
    expect(options.optionsFor(10, 'ACTCD')).toEqual([
      { id: 'RFA', text: 'RFA' }, { id: 'ACTCD', text: 'ACTCD (unresolved)' }
    ]);
    expect(options.hasUnresolvedSelection(10, 'ACTCD')).toBeTrue();
    options.retry(10);
    requests.expectOne(url(10)).flush([{ code: 'ACTCD', name: 'P01' }]);
    expect(options.optionsFor(10, 'ACTCD')).toEqual([{ id: 'ACTCD', text: 'P01' }]);
    expect(options.hasUnresolvedSelection(10, 'ACTCD')).toBeFalse();
  });

  it('leaves unscoped and unrelated failures on the existing global error path', () => {
    http.get(url(100)).subscribe({ error: () => {} });
    requests.expectOne(url(100)).flush({}, { status: 404, statusText: 'Not Found' });
    expect(router.navigate).toHaveBeenCalledTimes(1);

    scope.handleLocally(http.get(`${url(101)}/export`)).subscribe({ error: () => {} });
    requests.expectOne(`${url(101)}/export`).flush({}, { status: 500, statusText: 'Server Error' });
    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(errorHandler.registerNewError).toHaveBeenCalledTimes(2);
  });

  it('cancels in-flight and queued work on destruction', () => {
    [21, 22, 23, 24, 25].forEach(id => options.request(id));
    const inFlight = [21, 22, 23, 24].map(id => requests.expectOne(url(id)));
    options.destroy();
    expect(inFlight.every(request => request.cancelled)).toBeTrue();
    requests.expectNone(url(25));
  });
});
