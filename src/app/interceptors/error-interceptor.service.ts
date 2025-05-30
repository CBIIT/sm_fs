import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { ApplicationInitStatus, Inject, Injectable, InjectionToken } from '@angular/core';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize } from 'rxjs/operators';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { jsonStringifyRecursive, openNewWindow } from '../utils/utils';
import { Location } from '@angular/common';
import { HeartbeatService } from '@cbiit/i2ecui-lib';
import { v4 as uuidv4 } from 'uuid';
import { NGXLogger } from "ngx-logger";

export const DEBUG_ERROR_INTERCEPTOR = new InjectionToken<boolean>('debugMode', {
  providedIn: 'root',
  factory: () => false,
});

@Injectable({
  providedIn: 'root'
})
export class ErrorInterceptor implements HttpInterceptor {
  private modalWindow: any;
  private handled401 = false;
  private handlingError = false;
  private myUUID;

  constructor(
    private errorHandler: ErrorHandlerService,
    private router: Router,
    private location: Location,
    private initializerStatus: ApplicationInitStatus,
    private logger: NGXLogger,
    private heartbeatService: HeartbeatService,
    @Inject(DEBUG_ERROR_INTERCEPTOR) private debugMode: boolean
  ) {

    this.myUUID = uuidv4();
    this.logger.debug(`ErrorInterceptor UUID: ${this.myUUID}`);

    router.events.pipe(filter((event) => event instanceof NavigationStart)).subscribe((event: NavigationStart) => {
      this.handleNavigationStart(event);
    });

    router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.handleNavigationEnd(event);
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): any {
    if (!req.url.includes('heartbeat') && !!req.url.includes('logs') && this.debugMode) {
      this.logger.debug(`Current route URL    : ${this.router.url}`);
      this.logger.debug(`Request URL          : ${req.url}`);
      this.logger.debug(`Initialization status: ${this.initializerStatus.done ? 'Done' : 'In Progress'}`);
    }
    return next.handle(req).pipe(
      catchError((error) => {
        if(this.handlingError) {
          this.logger.info(`Already handling an error. Let this one pass: -----\n${jsonStringifyRecursive(error)}\n-----`);
          return of(EMPTY);
        } else {
          this.handlingError = true;
        }

        if (this.debugMode) this.verboseDetails(req, error);

        // Pass along errors that happen during initialization
        if (!this.initializerStatus.done) {
          if (this.debugMode) this.logger.debug('Initialization in progress. Let the error pass.');
          return throwError(error);
        }

        // Throw 400 errors automatically
        if (error.status === 400) {
          // BadRequestException, checked exception from backend.
          if (this.debugMode) this.logger.debug('400: let it pass');
          return throwError(error);
        }

        // Let the logger handle its own problems
        if (error.url.includes('logs') || req.url.includes('logs')) {
          if (this.debugMode) this.logger.debug('Let the logger handle its own messes');
          return throwError(error);
        }

        // Let the heartbeat & db-heartbeat services handle everything but timeouts
        if ((error.url.includes('heartbeat') || req.url.includes('heartbeat')) && !(error.status === 200)) {
          if (this.debugMode) this.logger.debug('Non-200 error from heartbeat');
          return throwError(error);
        }

        if (this.isUnauthorized(error)) {
          if (this.debugMode) this.logger.debug('Unauthorized');
          return this.handleUnauthorizedError(req, error);
        }

        // Handle timeouts
        if (this.isTimeOut(error)) {
          return this.handleTimeout(error);
        } else {
          return this.handleAllOtherErrors(req, error);
        }
      }),
      finalize(() => {
        this.modalWindow = undefined;
        this.handlingError = false;
      })
    );
  }

  private handleUnauthorizedError(req: HttpRequest<any>, error) {
    this.heartbeatService.pause();
    if (!this.handled401) {
      this.verboseDetails(req, error);
      this.handled401 = true;
      return this.router.navigate(['/unauthorize']);
    }
    return of(EMPTY);
  }

  private isUnauthorized(error) {
    return error.status === 401;
  }

  private isTimeOut(error) {
    return error.status === 200 && error.url?.startsWith('https://auth');
  }

  private handleAllOtherErrors(req: HttpRequest<any>, error) {
    // Handle all other errors
    this.verboseDetails(req, error);
    const timestamp: number = Date.now();
    this.errorHandler.registerNewError(timestamp, error);
    this.router.navigate(['/error', timestamp]).then(() => {
      this.logger.error('Finished navigating to /error');
    });
    return throwError(error);
  }

  private handleTimeout(error: any) {
    if (this.debugMode) this.logger.debug('Timeout encountered - redirect to login.');
    this.heartbeatService.pause();
    let url =
      '/fs/' +
      this.location.prepareExternalUrl(this.router.serializeUrl(this.router.createUrlTree(['restoreSession'])));
    url = window.location.origin + url;

    const features = 'popup,menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700,noreferrer';

    const errorUrl = new URL(error.url);
    errorUrl.searchParams.delete('TARGET');
    errorUrl.searchParams.set('TARGET', url);

    if (!this.modalWindow) {
      this.modalWindow = openNewWindow(errorUrl.toString(), 'Restore_Session', features);
    }

    return of(undefined);
  }

  handleNavigationStart(event: NavigationStart): void {
    if (this.debugMode) this.logger.debug('=======> NavigationStart', event);
  }

  handleNavigationEnd(event: NavigationEnd): void {
    if (this.debugMode) this.logger.debug('=======> NavigationEnd', event);
  }

  private verboseDetails(req: HttpRequest<any>, error: any) {
    this.logger.debug('--error summary-------------------------------------------------------------');
    this.logger.debug(`Error Type: ${this.errorHandler.errorType(error)}`);
    this.logger.debug(`Error URL: ${error.url}`);
    this.logger.debug(`Request URL: ${req.url}`);
    this.logger.debug(`Error Status: ${error.status}`);
    this.logger.debug(`UUID: ${this.myUUID}`);
    this.logger.debug(`Handling error: ${this.handlingError}`);
    this.logger.debug('--end error summary---------------------------------------------------------');

    this.logger.debug('--error details-------------------------------------------------------------');
    this.logger.debug(`Error: ${jsonStringifyRecursive(error)}`);
    this.logger.debug(`Failed request details: ${jsonStringifyRecursive(req)}`);
    this.logger.debug('--end error details---------------------------------------------------------');
  }
}
