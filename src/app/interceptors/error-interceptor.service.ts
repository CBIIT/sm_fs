import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, of, throwError } from 'rxjs';
import { catchError, filter, finalize } from 'rxjs/operators';
import { NavigationStart, Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { openNewWindow } from '../utils/utils';
import { Location } from '@angular/common';


@Injectable()
export class ErrorInterceptorService implements HttpInterceptor {

  private modalWindow: any;

  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger,
    private router: Router,
    private location: Location,
  ) {
    router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe((event: NavigationStart) => {
      this.handleNavigationStart(event);
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.logger.debug(`Current route url: ${this.router.url}`);
    // this.logger.debug(`Router state: ${this.router.routerState}`);
    this.logger.debug(`Current location: ${this.location.path(false)}`);

    return next.handle(req).pipe(
      catchError((error, caught) => {
        this.logger.debug(`Type of error caught: ${typeof error}`);

        if (error.status === 200 && error.url?.startsWith('https://auth')) {
          this.logger.warn('Error is most likely timeout - redirect to login.');
          // const url = '/fs/#' + this.router.createUrlTree(['restoreSession']).toString();
          let url = '/fs/' + this.location.prepareExternalUrl(this.router.serializeUrl(this.router.createUrlTree(['restoreSession'])));
          url = window.location.origin + url;

          this.logger.info(`Error URL: ${error.url}`);
          this.logger.info(`Restore session URL: ${url}`);
          const features = 'popup,menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700,noreferrer';

          const errorUrl = new URL(error.url);
          errorUrl.searchParams.delete('TARGET');
          errorUrl.searchParams.set('TARGET', url);

          this.logger.debug(`errorUrl: ${errorUrl} :: ${errorUrl.searchParams}`);

          if (!this.modalWindow) {
            this.modalWindow = openNewWindow(errorUrl.toString(), 'Restore Session', features);
          }
          return of(null);
        } else if (error.status === 400) {  // BadRequestException, checked exception from backend.
          return throwError(error);
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
    this.logger.debug('=======> NavigationStart');
    this.logger.debug(event);
  }
}
