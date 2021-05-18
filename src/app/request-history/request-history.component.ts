import {Component, OnDestroy, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {FsLookupControllerService, FundingReqStatusHistoryDto, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import { FundingRequestIntegrationService } from '../funding-request/integration/integration.service';
import { Subscription } from 'rxjs';

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
              private requestIntegrationService: FundingRequestIntegrationService) {
  }

  ngOnDestroy(): void {
    if (this.requestSubmissionEventSubscriber) {
      this.requestSubmissionEventSubscriber.unsubscribe();
    }
  }

  ngOnInit(): void {
    console.log(this.requestModel.requestDto.frqId);
    console.log(this.requestModel.requestDto.financialInfoDto.fundingRequestId);
    this.loadHistory();
    this.requestSubmissionEventSubscriber = this.requestIntegrationService.requestSubmissionEmitter.subscribe(
      (frqId) => {this.loadHistory(); }
    );
    // if (this.requestModel.requestDto.frqId != null) {
    //   this.fsLookupControllerService.getRequestHistoryUsingGET(this.requestModel.requestDto.frqId).subscribe(
    //     result => {
    //       this.histories = result;
    //       this.requestIntegrationService.requestHistoryLoadEmitter.next(result);
    //     },
    //     error => {
    //       console.log('HttpClient get request error for----- ' + error.message);
    //     });
    // }
  }

  loadHistory(): void {
    if (this.requestModel.requestDto.frqId != null) {
      this.fsLookupControllerService.getRequestHistoryUsingGET(this.requestModel.requestDto.frqId).subscribe(
        result => {
          console.log('request history loaded ', result);
          this.histories = result;
          this.requestIntegrationService.requestHistoryLoadEmitter.next(result);
        },
        error => {
          console.log('HttpClient get request error for----- ' + error.message);
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
