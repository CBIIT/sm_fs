import { Component, OnDestroy, OnInit } from '@angular/core';
import { FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';
import { Subscription } from 'rxjs';
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
              private integrationService: FundingRequestIntegrationService) {
  }

  ngOnDestroy(): void {
    if (this.requestSubmissionEventSubscriber) {
      this.requestSubmissionEventSubscriber.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.requestSubmissionEventSubscriber = this.integrationService.requestSubmissionEmitter.subscribe(
      (dto) =>
        {
          this.status = 'success';
          this.action = dto.completeRequest ? 'COMPLETE' : dto.action;
          this.frqId = dto.frqId;
        }
    );
    this.requestSubmitFailureEventSubscriber = this.integrationService.requestSubmitFailureEmitter.subscribe(
      (message) =>
        {
          this.status = 'failure';
          this.errorMessage = message;
        }
    );
  }

  get approver(): FundingReqApproversDto {
    return this.workflowModel.getNextApproverInChain();
  }

}
