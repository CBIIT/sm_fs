import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { openNewWindow } from '../utils/utils';
import { Location } from '@angular/common';
import { environment } from '../../environments/environment';
import { CookieService } from 'ngx-cookie';


@Injectable()
export class ErrorInterceptorService implements HttpInterceptor {

  private modalWindow: any;

  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger,
    private router: Router,
    private location: Location,
    private cookieService: CookieService
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.logger.debug(`Current route url: ${this.router.url}`);
    this.logger.debug(`Current location: ${this.location.path(false)}`);
    this.logger.debug(`Current origin: ${window.location.origin}`);
    this.logger.debug(`Current location state: ${JSON.stringify(this.location.getState())}`);

    this.logger.debug('cookies', this.cookieService.getAll());

    req.headers.keys().forEach(k => {
      this.logger.debug(`[h] ${k} == ${req.headers.get(k)}`);
    });
    return next.handle(req).pipe(
      // retry(1),
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
}
