import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { openNewWindow } from '../utils/utils';
import { Location } from '@angular/common';


@Injectable()
export class ErrorInterceptorService implements HttpInterceptor {
  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger,
    private router: Router,
    private location: Location
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.logger.debug(`Current route url: ${this.router.url}`);
    this.logger.debug(`Current location: ${this.location.path(false)}`);
    this.logger.debug(`Current location state: ${JSON.stringify(this.location.getState())}`);
    return next.handle(req).pipe(
      // retry(1),
      catchError((error, caught) => {
        // this.logger.warn(`Raw error: ${JSON.stringify(error)}`);
        this.logger.debug(`Type of error caught: ${typeof error}`)

        if (error.status === 200 && error.url?.startsWith('https://auth')) {
          this.logger.warn('Error is most likely timeout - redirect to login.');
          // const url = '/fs/#' + this.router.createUrlTree(['restoreSession']).toString();
          const url = this.location.prepareExternalUrl(this.router.serializeUrl(this.router.createUrlTree(['restoreSession'])));
          this.logger.info(`Error URL: ${error.url}`);
          this.logger.info(`Restore session URL: ${url}`);
          // const currentRoute = this.router.routerState;
          //
          // this.router.navigateByUrl(currentRoute.snapshot.url, { skipLocationChange: true });

          openNewWindow(url, 'Restore Session', undefined);
          // const modalRef = this.modalService.open(SessionRestoreComponent, { size: 'lg' });
          // this.logger.info('after open restore modal');
          // const obs = from(modalRef.result.then(() => {
          //   this.logger.info(`restore modal closed: ${this.router.url}`);
          //   this.router.navigate([this.router.url]);
          // }));
          // return obs as unknown as Observable<HttpEvent<any>>;
          return of(null);
        } else {
          const timestamp: number = Date.now();
          this.errorHandler.registerNewError(timestamp, error);
          this.router.navigate(['/error', timestamp]);
          return throwError(error);
        }
      })
    );
  }
}
