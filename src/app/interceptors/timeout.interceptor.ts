import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../error/error-handler.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SessionRestoreComponent } from '../session/session-restore/session-restore.component';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger,
    private router: Router,
    private modalService: NgbModal
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // this.logger.debug(req, next);
    // this.logger.debug(`Current route: ${this.router.url}`);
    return next.handle(req).pipe(
      retry(1),
      catchError((error, caught) => {
        // this.logger.warn(`Raw error: ${JSON.stringify(error)}`);

        if (error.status === 200 && error.url?.startsWith('https://auth')) {
          this.logger.warn('Error is most likely timeout - redirect to login.');
          // const url = '/fs/#' + this.router.createUrlTree(['restoreSession']).toString();
          const modalRef = this.modalService.open(SessionRestoreComponent, { size: 'lg' });
          modalRef.result.then(() => {
            this.router.navigate([this.router.url]);
          });
          this.logger.info('throwing the error just for fun');
          return throwError(error);
          // return from(this.router.navigate([this.router.url]));
          // return obs as unknown as Observable<HttpEvent<any>>;
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
