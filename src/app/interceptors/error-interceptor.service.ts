import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { ApplicationInitStatus, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize } from 'rxjs/operators';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { openNewWindow } from '../utils/utils';
import { Location } from '@angular/common';
import { CustomServerLoggingService } from '../logging/custom-server-logging-service';


@Injectable()
export class ErrorInterceptorService implements HttpInterceptor {

  private modalWindow: any;

  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger,
    private router: Router,
    private location: Location,
    private initializerStatus: ApplicationInitStatus,
    private customLogger: CustomServerLoggingService,
  ) {
    router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((event: NavigationStart) => {
      this.handleNavigationStart(event);
    });

    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.handleNavigationEnd(event);
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.logger.debug(`Current route URL    : ${this.router.url}`);
    this.logger.debug(`Request URL          : ${req.url}`);
    this.logger.debug(`Initialization status: ${this.initializerStatus.done ? 'Done' : 'In Progress'}`);

    return next.handle(req).pipe(
      catchError((error) => {
        if (error.status === 200 && error.url?.startsWith('https://auth')) {
          this.logger.warn('Error is most likely timeout - redirect to login.');
          // const url = '/fs/#' + this.router.createUrlTree(['restoreSession']).toString();
          let url = '/fs/' + this.location.prepareExternalUrl(this.router.serializeUrl(this.router.createUrlTree(['restoreSession'])));
          url = window.location.origin + url;

          this.logger.info(`Error URL: ${error.url}`);
          this.logger.info(`Source URL of error: ${this.router.url}`);
          this.logger.info(`Restore session URL: ${url}`);
          const features = 'popup,menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700,noreferrer';

          const errorUrl = new URL(error.url);
          errorUrl.searchParams.delete('TARGET');
          errorUrl.searchParams.set('TARGET', url);

          if (!this.modalWindow) {
            this.modalWindow = openNewWindow(errorUrl.toString(), 'Restore_Session', features);
          }
          return of(undefined);
        } else if (error.status === 400) {  // BadRequestException, checked exception from backend.
          return throwError(error);
        } else {
          const timestamp: number = Date.now();
          this.errorHandler.registerNewError(timestamp, error);
          this.router.navigate(['/error', timestamp]);
          // return throwError(error);
          return of(undefined);
        }
      }), finalize(() => {
        this.modalWindow = undefined;
      })
    );
  }

  handleNavigationStart(event: NavigationStart): void {
    // this.customLogger.logServer('=======> NavigationStart', event);
  }

  handleNavigationEnd(event: NavigationEnd): void {
    // this.customLogger.logServer('=======> NavigationEnd', event);
  }
}
