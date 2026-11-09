import { HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

import {
  FundingRequestErrorScopeInterceptor, FundingRequestErrorScopeService, HANDLE_FUNDING_REQUEST_ERROR_LOCALLY
} from './funding-request-error-scope.service';

describe('FundingRequestErrorScopeInterceptor', () => {
  let scope: FundingRequestErrorScopeService;
  let interceptor: FundingRequestErrorScopeInterceptor;

  beforeEach(() => {
    scope = new FundingRequestErrorScopeService();
    interceptor = new FundingRequestErrorScopeInterceptor(scope);
  });

  it('marks a single opted-in write before asynchronous downstream handling', () => {
    const response = new Subject<HttpEvent<unknown>>();
    let forwarded: HttpRequest<unknown>;
    const handler: HttpHandler = {
      handle: request => {
        forwarded = request;
        return response;
      }
    };
    const request = new HttpRequest('POST', '/i2efsws/api/v1/funding-submissions/lists/1/grants/bulk-update', {});
    scope.handleLocally(new Observable(subscriber => interceptor.intercept(request, handler).subscribe(subscriber)))
      .subscribe();
    expect(forwarded.context.get(HANDLE_FUNDING_REQUEST_ERROR_LOCALLY)).toBeTrue();
    expect(scope.active).toBeFalse();
    response.next(new HttpResponse({ status: 200 }));
    response.complete();
  });

  it('does not mark unrelated requests or funding requests without an explicit scope', () => {
    const requests: HttpRequest<unknown>[] = [];
    const handler: HttpHandler = {
      handle: request => {
        requests.push(request);
        return new Observable(subscriber => subscriber.complete());
      }
    };
    const funding = new HttpRequest('GET', '/i2efsws/api/v1/funding-submissions/lists/1');
    const unrelated = new HttpRequest('GET', '/i2efsws/api/v1/other');
    interceptor.intercept(funding, handler).subscribe();
    scope.handleLocally(new Observable(subscriber => interceptor.intercept(unrelated, handler).subscribe(subscriber)))
      .subscribe();
    expect(requests.map(request => request.context.get(HANDLE_FUNDING_REQUEST_ERROR_LOCALLY))).toEqual([false, false]);
  });

  it('scopes status history failures only when the removal readback opts in', () => {
    const requests: HttpRequest<unknown>[] = [];
    const handler: HttpHandler = {
      handle: request => {
        requests.push(request);
        return new Observable(subscriber => subscriber.complete());
      }
    };
    const history = new HttpRequest('GET', '/i2efsws/api/v1/funding-submissions/lists/1/status-history');

    interceptor.intercept(history, handler).subscribe();
    const scopedHistory = new HttpRequest('GET', '/i2efsws/api/v1/funding-submissions/lists/1/status-history');
    scope.handleLocally(new Observable(subscriber => interceptor.intercept(scopedHistory, handler).subscribe(subscriber)))
      .subscribe();

    expect(requests.map(request => request.context.get(HANDLE_FUNDING_REQUEST_ERROR_LOCALLY))).toEqual([false, true]);
  });

  it('scopes the opted-in removal without capturing unrelated DELETE requests', () => {
    const requests: HttpRequest<unknown>[] = [];
    const handler: HttpHandler = {
      handle: request => {
        requests.push(request);
        return new Observable(subscriber => subscriber.complete());
      }
    };
    const removal = new HttpRequest('DELETE', '/i2efsws/api/v1/funding-submissions/lists/1/grants');
    const unrelated = new HttpRequest('DELETE', '/i2efsws/api/v1/other');
    scope.handleLocally(new Observable(subscriber => interceptor.intercept(removal, handler).subscribe(subscriber)))
      .subscribe();
    scope.handleLocally(new Observable(subscriber => interceptor.intercept(unrelated, handler).subscribe(subscriber)))
      .subscribe();
    expect(requests.map(request => request.context.get(HANDLE_FUNDING_REQUEST_ERROR_LOCALLY))).toEqual([true, false]);
  });

  it('scopes only the opted-in grant Budget Categories GET, including an absolute URL and query', () => {
    const forwarded: HttpRequest<unknown>[] = [];
    const handler: HttpHandler = {
      handle: request => {
        forwarded.push(request);
        return new Observable(subscriber => subscriber.complete());
      }
    };
    const path = '/i2efsws/api/v1/funding-submissions/grants/123/budget-category-options';
    const requests = [
      new HttpRequest('GET', `https://api.example.test${path}?source=edit`),
      new HttpRequest('GET', path),
      new HttpRequest('POST', path, {}),
      new HttpRequest('GET', `${path}/export`),
      new HttpRequest('GET', '/i2efsws/api/v1/funding-submissions/grants/no-id/budget-category-options')
    ];
    requests.forEach((request, index) => {
      const request$ = new Observable(subscriber => interceptor.intercept(request, handler).subscribe(subscriber));
      (index === 1 ? request$ : scope.handleLocally(request$)).subscribe();
    });
    expect(forwarded.map(request => request.context.get(HANDLE_FUNDING_REQUEST_ERROR_LOCALLY)))
      .toEqual([true, false, false, false, false]);
  });
});
