import { Component, OnDestroy, OnInit } from '@angular/core';
import { FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { FundingRequestIntegrationService } from 'src/app/funding-request/integration/integration.service';
import { WorkflowModel } from 'src/app/funding-request/workflow/workflow.model';
import { PlanModel } from 'src/app/model/plan/plan-model';

@Component({
  selector: 'app-plan-submission-alert',
  templateUrl: './plan-submission-alert.component.html',
  styleUrls: ['./plan-submission-alert.component.css']
})
export class PlanSubmissionAlertComponent implements OnInit, OnDestroy {

  private requestSubmissionEventSubscriber: Subscription;
  private requestSubmitFailureEventSubscriber: Subscription;
  status: string;
  action: string;
  fprId: number;
  errorMessage: string;

  constructor(private workflowModel: WorkflowModel,
              private logger: NGXLogger,
              private planModel: PlanModel,
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
          this.planModel.clearAlerts();
          this.status = 'success';
          this.action = dto.completeRequest ? 'COMPLETE' : dto.action;
          this.fprId = dto.fprId;
          window.scrollTo(0, 0);
        }
    );
    this.requestSubmitFailureEventSubscriber = this.integrationService.requestSubmitFailureEmitter.subscribe(
      (errorResponse) =>
        {
          this.planModel.clearAlerts();
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
