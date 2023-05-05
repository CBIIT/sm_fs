import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { FsLookupControllerService, FundingReqStatusHistoryDto } from '@cbiit/i2efsws-lib';
import { FundingRequestIntegrationService } from '../funding-request/integration/integration.service';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../model/plan/plan-model';

@Component({
  selector: 'app-request-history',
  templateUrl: './request-history.component.html',
  styleUrls: ['./request-history.component.css']
})
export class RequestHistoryComponent implements OnInit, OnDestroy {
  @Input() requestOrPlan: 'REQUEST'|'PLAN' = 'REQUEST';
  histories: FundingReqStatusHistoryDto[];
  requestSubmissionEventSubscriber: Subscription;
  title: string;

  constructor(private requestModel: RequestModel,
              private planModel: PlanModel,
              private fsLookupControllerService: FsLookupControllerService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private logger: NGXLogger) {
  }

  ngOnDestroy(): void {
    if (this.requestSubmissionEventSubscriber) {
      this.requestSubmissionEventSubscriber.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.title = this.requestOrPlan === 'REQUEST' ? 'Request History' : 'Funding Plan History';
    this.loadHistory();
    this.requestSubmissionEventSubscriber = this.requestIntegrationService.requestSubmissionEmitter.subscribe(
      () => { this.loadHistory(); }
    );
  }

  loadHistory(): void {
    if (this.requestOrPlan === 'REQUEST' && this.requestModel.requestDto.frqId != null) {
      this.fsLookupControllerService.getRequestHistory(this.requestModel.requestDto.frqId).subscribe(
        result => {
          this.histories = result;
          this.logger.debug('request status history ', result);
          this.requestIntegrationService.requestHistoryLoadEmitter.next(result);
        },
        error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
    else if (this.requestOrPlan === 'PLAN' && this.planModel != null) {
      this.fsLookupControllerService.getPlanHistory(this.planModel.fundingPlanDto.fprId).subscribe(
        result => {
          this.histories = result;
          this.logger.debug('plan status history ', result);
          this.requestIntegrationService.requestHistoryLoadEmitter.next(result);
        },
        error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
  }
}
