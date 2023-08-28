import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { ApplicationInitStatus, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize } from 'rxjs/operators';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { openNewWindow, jsonStringifyRecursive } from '../utils/utils';
import { Location } from '@angular/common';
import { CustomServerLoggingService, HeartbeatService } from '@cbiit/i2ecui-lib';


@Injectable()
export class ErrorInterceptorService implements HttpInterceptor {

  private modalWindow: any;
  private handle401 = false;

  constructor(
    private errorHandler: ErrorHandlerService,
    private router: Router,
    private location: Location,
    private initializerStatus: ApplicationInitStatus,
    private logger: CustomServerLoggingService,
    private heartbeatService: HeartbeatService,
  ) {
    router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((event: NavigationStart) => {
      this.handleNavigationStart(event);
    });

    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.handleNavigationEnd(event);
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url.includes('heartbeat') && !!req.url.includes('logs')) {
      this.logger.debug(`Current route URL    : ${this.router.url}`);
      this.logger.debug(`Request URL          : ${req.url}`);
      this.logger.debug(`Initialization status: ${this.initializerStatus.done ? 'Done' : 'In Progress'}`);
    }

    return next.handle(req).pipe(
      catchError((error) => {
        this.logger.debug(`Error: ${this.errorHandler.errorType(error)}`, error);
        this.logger.debug(`Error URL: ${error.url}`);
        this.logger.debug(`Request URL: ${req.url}`);
        this.logger.debug(`Error Status: ${error.status}`);

        if(error.status === 401) this.heartbeatService.pause();

        // Pass along errors that happen during initialization
        if (!this.initializerStatus.done) {
          this.logger.debug('Initialization in progress. Let the error pass.');
          return throwError(error);
        }

        // Throw 400 errors automatically
        if (error.status === 400) {  // BadRequestException, checked exception from backend.
          this.logger.debug('400: let it pass');
          return throwError(error);
        }

        // Let the logger handle its own problems
        if (error.url.includes('logs') || req.url.includes('logs')) {
          this.logger.debug('Let the logger handle its own messes');
          return throwError(error);
        }

        // Let the logger handle its own problems
        if (error.url.includes('db-heartbeat') || req.url.includes('db-heartbeat')) {
          this.logger.debug('Let the db-heartbeat handle its own messes');
          return throwError(error);
        }

        // Let the heartbeat service handle everything but timeouts
        if ((error.url.includes('heartbeat') || req.url.includes('heartbeat')) && !(error.status === 200)) {
          this.logger.debug('Non-200 error from heartbeat');
          return throwError(error);
        }

        if (error.status === 401) {
          this.record401(req, error);
          if(!this.handle401) {
            this.handle401 = true;
            this.heartbeatService.pause();
            this.router.navigate(['/unauthorize']);
          }
          return of(null);
        }

        // Handle timeouts
        if (error.status === 200 && error.url?.startsWith('https://auth')) {
          this.logger.debug('Timeout encountered - redirect to login.', error);
          this.heartbeatService.pause();
          let url = '/fs/' + this.location.prepareExternalUrl(this.router.serializeUrl(this.router.createUrlTree(['restoreSession'])));
          url = window.location.origin + url;

          const features = 'popup,menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700,noreferrer';

          const errorUrl = new URL(error.url);
          errorUrl.searchParams.delete('TARGET');
          errorUrl.searchParams.set('TARGET', url);

          if (!this.modalWindow) {
            this.modalWindow = openNewWindow(errorUrl.toString(), 'Restore_Session', features);
          }

          return of(undefined);
        } else {
          const timestamp: number = Date.now();
          this.errorHandler.registerNewError(timestamp, error);
          this.router.navigate(['/error', timestamp]);
          return throwError(error);
        }
      }), finalize(() => {
        this.modalWindow = undefined;
      })
    );
  }

  handleNavigationStart(event: NavigationStart): void {
    this.logger.info('=======> NavigationStart', event);
  }

  handleNavigationEnd(event: NavigationEnd): void {
    this.logger.info('=======> NavigationEnd', event);
  }

  private record401(req: HttpRequest<any>, error: any) : void {
    this.logger.error(`Error: ${jsonStringifyRecursive(error)}`);
    this.logger.error(`Failed request details: ${jsonStringifyRecursive(req)}`);
  }
}
