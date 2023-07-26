import { Component, OnDestroy, OnInit } from '@angular/core';
import { FundingReqApproversDto } from '@cbiit/i2efsws-lib';
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
  private bobTeam = 'nciogabob@mail.nih.gov';
  errorLabel = 'Failed to submit request:';

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

        if(this.errorMessage.startsWith('4R00')) {
          const r00 = this.errorMessage;
          this.errorMessage = `Request cannot be approved, since the ${r00} cannot be found in I2E. Please contact <a href='mailto:${this.bobTeam}'>NCI OGA Business Operations Branch</a> to create the 4R00 record in IMPAC II.`
          this.errorLabel = 'Error:'
        } else {
          this.errorLabel = 'Failed to submit request:';
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
