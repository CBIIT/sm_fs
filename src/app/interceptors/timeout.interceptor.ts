import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { openNewWindow } from '../utils/utils';
import { ErrorHandlerService } from '../error/error-handler.service';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  constructor(
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger,
    private router: Router
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // this.logger.debug(req, next);
    return next.handle(req).pipe(
      catchError((error, caught) => {
        // this.logger.warn(`Raw error: ${JSON.stringify(error)}`);

        const timestamp: number = Date.now();
        this.errorHandler.registerNewError(timestamp, error);

        if (error.status === 200 && error.text?.includes('HTML')) {
          this.logger.warn('Error is most likely timeout - redirect to login.');
          const url = '/fs/#' + this.router.createUrlTree(['restoreSession']).toString();
          openNewWindow(url, 'Restore Session', undefined);
          // return null;
        }
        this.router.navigate(['/error', timestamp]);
        throw error;
      })
    );
  }
}
