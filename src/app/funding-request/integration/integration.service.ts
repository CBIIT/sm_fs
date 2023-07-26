import { Injectable } from '@angular/core';
import { FundingReqApproversDto, FundingReqStatusHistoryDto, WorkflowTaskDto } from '@cbiit/i2efsws-lib';
import { Subject } from 'rxjs';

@Injectable({providedIn: 'root'})
export class FundingRequestIntegrationService {
  requestHistoryLoadEmitter = new Subject<FundingReqStatusHistoryDto[]>();
  requestSubmissionEmitter = new Subject<WorkflowTaskDto>();
  requestSubmitFailureEmitter = new Subject<any>();
  approverInitializationEmitter = new Subject<void>();
  approverListChangeEmitter = new Subject<void>();
  activeApproverEmitter = new Subject<FundingReqApproversDto>();

  requestCanLoadedEmitter = new Subject<void>();
}
