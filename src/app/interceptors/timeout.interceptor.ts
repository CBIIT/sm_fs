import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { openNewWindow } from '../utils/utils';
import { ErrorHandlerService } from '../error/error-handler.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSourceEntryModalComponent } from '../funding-plan/applications-proposed-for-funding/funding-source-entry-modal/funding-source-entry-modal.component';
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
    return next.handle(req).pipe(
      catchError((error, caught) => {
        // this.logger.warn(`Raw error: ${JSON.stringify(error)}`);

        if (error.status === 200 && error.url?.startsWith('https://auth')) {
          this.logger.warn('Error is most likely timeout - redirect to login.');
          const url = '/fs/#' + this.router.createUrlTree(['restoreSession']).toString();
          const modalRef = this.modalService.open(SessionRestoreComponent, { size: 'lg' });
          modalRef.result.then(() => {
            //return next.handle(req);
          });
        } else {
          const timestamp: number = Date.now();
          this.errorHandler.registerNewError(timestamp, error);
          this.router.navigate(['/error', timestamp]);
          throw error;
        }
      })
    );
  }
}
