import {Injectable} from '@angular/core';
import {FundingRequestErrorCodes} from './funding-request-error-codes';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FundingRequestValidationService {
  raiseError = new Subject<FundingRequestErrorCodes>();
  resolveError = new Subject<FundingRequestErrorCodes>();
}
