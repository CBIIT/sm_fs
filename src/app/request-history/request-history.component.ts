import { Component, OnDestroy, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { FsLookupControllerService, FundingReqStatusHistoryDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { FundingRequestIntegrationService } from '../funding-request/integration/integration.service';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-request-history',
  templateUrl: './request-history.component.html',
  styleUrls: ['./request-history.component.css']
})
export class RequestHistoryComponent implements OnInit, OnDestroy {
  histories: FundingReqStatusHistoryDto[];
  requestSubmissionEventSubscriber: Subscription;

  constructor(private requestModel: RequestModel,
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
    this.loadHistory();
    this.requestSubmissionEventSubscriber = this.requestIntegrationService.requestSubmissionEmitter.subscribe(
      () => { this.loadHistory(); }
    );
  }

  loadHistory(): void {
    if (this.requestModel.requestDto.frqId != null) {
      this.fsLookupControllerService.getRequestHistoryUsingGET(this.requestModel.requestDto.frqId).subscribe(
        result => {
          this.histories = result;
          this.requestIntegrationService.requestHistoryLoadEmitter.next(result);
        },
        error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

}
