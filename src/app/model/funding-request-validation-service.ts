import {Injectable} from '@angular/core';
import {FundingRequestErrorCodes} from './funding-request-error-codes';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FundingRequestValidationService {
  frErrorCodes: Set<FundingRequestErrorCodes> = new Set<FundingRequestErrorCodes>();

  raiseError = new Subject<FundingRequestErrorCodes>();
  resolveError = new Subject<FundingRequestErrorCodes>();


  pushError(e: FundingRequestErrorCodes): void {
    this.frErrorCodes.add(e);
    this.raiseError.next(e);
  }

  clearError(e: FundingRequestErrorCodes): void {
    if (this.frErrorCodes.has(e)) {
      this.frErrorCodes.delete(e);
      this.resolveError.next(e);
    }
  }

  clearErrors(): void {
    this.frErrorCodes.forEach(e => {
      this.resolveError.next(e);
    });

    this.frErrorCodes.clear();
  }


}
