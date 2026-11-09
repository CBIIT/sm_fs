import { HttpContextToken, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export const HANDLE_FUNDING_REQUEST_ERROR_LOCALLY = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class FundingRequestErrorScopeService {
  private issuingRequest = 0;

  get active(): boolean {
    return this.issuingRequest > 0;
  }

  handleLocally<T>(request: Observable<T>): Observable<T> {
    return new Observable<T>(subscriber => {
      this.issuingRequest++;
      try {
        return request.subscribe(subscriber);
      } finally {
        this.issuingRequest--;
      }
    });
  }
}

@Injectable()
export class FundingRequestErrorScopeInterceptor implements HttpInterceptor {
  constructor(private scope: FundingRequestErrorScopeService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.scope.active && this.isFundingEditRequest(req)) {
      req = req.clone({ context: req.context.set(HANDLE_FUNDING_REQUEST_ERROR_LOCALLY, true) });
    }
    return next.handle(req);
  }

  private isFundingEditRequest(req: HttpRequest<unknown>): boolean {
    const path = new URL(req.url, 'http://localhost').pathname;
    return (req.method === 'POST'
      && /\/funding-submissions\/lists\/\d+\/grants\/bulk-update$/.test(path))
      || (req.method === 'DELETE'
        && /\/funding-submissions\/lists\/\d+\/grants$/.test(path))
      || (req.method === 'GET'
        && /\/funding-submissions\/lists\/\d+(?:\/status-history|\/grants\/(?:doc-pay-defaults|\d+\/doc-priority-options))?$/
          .test(path))
      || (req.method === 'GET'
        && /\/funding-submissions\/grants\/\d+\/budget-category-options$/.test(path));
  }
}
