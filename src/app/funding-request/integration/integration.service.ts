import {Injectable} from '@angular/core';
import { FundingReqApproversDto, FundingReqStatusHistoryDto } from '@nci-cbiit/i2ecws-lib';
import {Subject} from 'rxjs';

@Injectable({providedIn: 'root'})
export class FundingRequestIntegrationService {
  requestHistoryLoadEmitter = new Subject<FundingReqStatusHistoryDto[]>();
  requestSubmissionEmitter = new Subject<number>();
  approverListChangeEmitter = new Subject<void>();
  activeApproverEmitter = new Subject<FundingReqApproversDto>();
}
