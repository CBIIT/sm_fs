import {Injectable} from '@angular/core';
import { FundingReqStatusHistoryDto } from '@nci-cbiit/i2ecws-lib';
import {Subject} from 'rxjs';

@Injectable({providedIn: 'root'})
export class FundingRequestIntegrationService {
  requestHistoryLoadEmitter = new Subject<FundingReqStatusHistoryDto[]>();
}
