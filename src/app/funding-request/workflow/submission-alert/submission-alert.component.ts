import { Component, OnDestroy, OnInit } from '@angular/core';
import { FundingReqApproversDto } from '@cbiit/i2ecws-lib';
import { Subscription } from 'rxjs';
import { RequestModel } from 'src/app/model/request/request-model';
import { FundingRequestIntegrationService } from '../../integration/integration.service';
import { WorkflowModel } from '../workflow.model';

@Component({
  selector: 'app-submission-alert',
  templateUrl: './submission-alert.component.html',
  styleUrls: ['./submission-alert.component.css']
})
export class SubmissionAlertComponent implements OnInit, OnDestroy {

  private requestSubmissionEventSubscriber: Subscription;
  private requestSubmitFailureEventSubscriber: Subscription;
  status: string;
  action: string;
  frqId: number;
  errorMessage: string;

  constructor(private workflowModel: WorkflowModel,
              private requestModel: RequestModel,
              private integrationService: FundingRequestIntegrationService) {
  }

  ngOnDestroy(): void {
    if (this.requestSubmissionEventSubscriber) {
      this.requestSubmissionEventSubscriber.unsubscribe();
    }
    if (this.requestSubmitFailureEventSubscriber) {
      this.requestSubmitFailureEventSubscriber.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.requestSubmissionEventSubscriber = this.integrationService.requestSubmissionEmitter.subscribe(
      (dto) =>
        {
          this.requestModel.clearAlerts();
          this.status = 'success';
          this.action = dto.completeRequest ? 'COMPLETE' : dto.action;
          this.frqId = dto.frqId;
          window.scrollTo(0, 0);
        }
    );
    this.requestSubmitFailureEventSubscriber = this.integrationService.requestSubmitFailureEmitter.subscribe(
      (errorResponse) =>
      {
        this.status = 'failure';
        if (errorResponse.error?.errorMessage) {
          this.errorMessage = errorResponse.error.errorMessage;
        }
        else {
          this.errorMessage = errorResponse.message;
        }
        window.scrollTo(0, 0);
      }
    );
  }

  get approver(): FundingReqApproversDto {
    return this.workflowModel.getNextApproverInChain();
  }

  get docApprover(): FundingReqApproversDto {
    return this.workflowModel.getDocApprover();
  }

}
