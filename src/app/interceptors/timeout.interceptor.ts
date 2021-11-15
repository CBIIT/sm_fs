import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { TimeoutService } from '../service/timeout.service';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  constructor(
    private timeoutService: TimeoutService,
    private logger: NGXLogger,
    private router: Router) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // this.logger.debug(req, next);
    return next.handle(req).pipe(
      catchError((error, caught) => {
        // TODO: don't log errors to the log url... :)
        this.logger.warn('-- error --', error);
        this.logger.warn('-- caught --', caught);
        return Observable.throw('Something bad happened');
      })
    );
  }
}
 