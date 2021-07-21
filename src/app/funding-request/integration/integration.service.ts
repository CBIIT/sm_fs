import {Injectable} from '@angular/core';
import { FundingReqApproversDto, FundingReqStatusHistoryDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import {Subject} from 'rxjs';

@Injectable({providedIn: 'root'})
export class FundingRequestIntegrationService {
  requestHistoryLoadEmitter = new Subject<FundingReqStatusHistoryDto[]>();
  requestSubmissionEmitter = new Subject<WorkflowTaskDto>();
  requestSubmitFailureEmitter = new Subject<string>();
  approverInitializationEmitter = new Subject<void>();
  approverListChangeEmitter = new Subject<void>();
  activeApproverEmitter = new Subject<FundingReqApproversDto>();
}
