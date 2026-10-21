import { HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { ApplicationInitStatus } from '@angular/core';
import { Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { HeartbeatService } from '@cbiit/i2ecui-lib';
import { NGXLogger } from 'ngx-logger';
import { of, Subject, throwError } from 'rxjs';
import { ErrorHandlerService } from '../error/error-handler.service';
import { ErrorInterceptor } from './error-interceptor.service';

describe('ErrorInterceptor add-grants conflict handling', () => {
  const addGrantsUrl = '/i2efsws/api/v1/funding-submissions/lists';

  function createHarness() {
    const routerEvents = new Subject<any>();
    const errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', [
      'errorType',
      'registerNewError'
    ]);
    errorHandler.errorType.and.returnValue('HTTP error');
    const router = {
      events: routerEvents,
      url: '/funding-submissions/create',
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
    } as unknown as Router;
    const logger = jasmine.createSpyObj<NGXLogger>('NGXLogger', ['debug', 'info', 'error']);
    const heartbeatService = jasmine.createSpyObj<HeartbeatService>('HeartbeatService', ['pause', 'continue']);
    const msalBroadcastService = { inProgress$: of(InteractionStatus.None) } as MsalBroadcastService;
    const initializerStatus = { done: true } as unknown as ApplicationInitStatus;
    const interceptor = new ErrorInterceptor(
      errorHandler,
      router,
      initializerStatus,
      logger,
      heartbeatService,
      msalBroadcastService,
      false
    );

    return { interceptor, errorHandler, router };
  }

  function sendError(
    interceptor: ErrorInterceptor,
    url: string,
    method: 'GET' | 'POST' | 'DELETE',
    status: number
  ): HttpErrorResponse {
    const request = method === 'POST'
      ? new HttpRequest('POST', url, {})
      : method === 'DELETE'
        ? new HttpRequest('DELETE', url)
        : new HttpRequest('GET', url);
    const error = new HttpErrorResponse({ status, url });
    const handler: HttpHandler = {
      handle: jasmine.createSpy('handle').and.returnValue(throwError(() => error))
    };
    let receivedError: HttpErrorResponse;

    interceptor.intercept(request, handler).subscribe({
      error: (err: HttpErrorResponse) => receivedError = err
    });

    expect(receivedError).toBe(error);
    return error;
  }

  it('rethrows a 409 from the exact add-grants POST endpoint without global handling', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, addGrantsUrl, 'POST', 409);

    expect(errorHandler.registerNewError).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('matches an absolute configured API base URL with a query string', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, `https://api.example.test${addGrantsUrl}?source=grant-search`, 'POST', 409);

    expect(errorHandler.registerNewError).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps global handling for a similarly suffixed endpoint path', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, `${addGrantsUrl}/export`, 'POST', 409);

    expect(errorHandler.registerNewError).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/error', jasmine.any(Number)]);
  });

  it('keeps global handling for an unrelated endpoint', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, '/i2efsws/api/v1/funding-submissions/other', 'POST', 409);

    expect(errorHandler.registerNewError).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/error', jasmine.any(Number)]);
  });

  it('keeps global handling for another method on the add-grants endpoint', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, addGrantsUrl, 'GET', 409);

    expect(errorHandler.registerNewError).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/error', jasmine.any(Number)]);
  });

  it('keeps global handling for a 500 from the add-grants POST endpoint', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, addGrantsUrl, 'POST', 500);

    expect(errorHandler.registerNewError).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/error', jasmine.any(Number)]);
  });

  it('retains the existing pass-through behavior for 400 responses', () => {
    const { interceptor, errorHandler, router } = createHarness();

    sendError(interceptor, addGrantsUrl, 'POST', 400);

    expect(errorHandler.registerNewError).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('remove-grants conflict handling', () => {
    const removeGrantsUrl = '/i2efsws/api/v1/funding-submissions/lists/123/grants';

    it('rethrows a 409 from the exact remove-grants DELETE with a query string', () => {
      const { interceptor, errorHandler, router } = createHarness();

      sendError(interceptor, `${removeGrantsUrl}?applIds=111&applIds=222`, 'DELETE', 409);

      expect(errorHandler.registerNewError).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('matches the exact path on an absolute API URL', () => {
      const { interceptor, errorHandler, router } = createHarness();

      sendError(interceptor, `https://api.example.test${removeGrantsUrl}?applIds=111`, 'DELETE', 409);

      expect(errorHandler.registerNewError).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('keeps global handling for other methods, suffix paths, and unrelated 409s', () => {
      const { interceptor, errorHandler, router } = createHarness();

      sendError(interceptor, removeGrantsUrl, 'GET', 409);
      sendError(interceptor, `${removeGrantsUrl}/export`, 'DELETE', 409);
      sendError(interceptor, '/i2efsws/api/v1/funding-submissions/lists/not-a-number/grants', 'DELETE', 409);
      sendError(interceptor, '/i2efsws/api/v1/funding-submissions/other', 'DELETE', 409);

      expect(errorHandler.registerNewError).toHaveBeenCalledTimes(4);
      expect(router.navigate).toHaveBeenCalledTimes(4);
    });
  });

  describe('justification conflict handling', () => {
    const justificationUrl = '/i2efsws/api/v1/funding-submissions/lists/123/grants/456/justification';

    it('rethrows a 409 from the exact justification-save POST without global handling', () => {
      const { interceptor, errorHandler, router } = createHarness();

      sendError(interceptor, justificationUrl, 'POST', 409);

      expect(errorHandler.registerNewError).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('matches the exact path with an absolute API URL and query string', () => {
      const { interceptor, errorHandler, router } = createHarness();

      sendError(interceptor, `https://api.example.test${justificationUrl}?source=grant-detail`, 'POST', 409);

      expect(errorHandler.registerNewError).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('keeps global handling for other methods and non-exact justification routes', () => {
      const { interceptor, errorHandler, router } = createHarness();

      sendError(interceptor, justificationUrl, 'GET', 409);
      sendError(interceptor, `${justificationUrl}/metadata`, 'POST', 409);
      sendError(interceptor, '/i2efsws/api/v1/funding-submissions/lists/123/grants/other/justification', 'POST', 409);
      sendError(interceptor, '/i2efsws/api/v1/funding-submissions/lists/123/grants/456/justification/archive', 'POST', 409);

      expect(errorHandler.registerNewError).toHaveBeenCalledTimes(4);
      expect(router.navigate).toHaveBeenCalledTimes(4);
    });
  });
});
