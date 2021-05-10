import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {FsLookupControllerService, FundingReqStatusHistoryDto, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-request-history',
  templateUrl: './request-history.component.html',
  styleUrls: ['./request-history.component.css']
})
export class RequestHistoryComponent implements OnInit {
  histories: FundingReqStatusHistoryDto[];

  constructor(private requestModel: RequestModel, private fsLookupControllerService: FsLookupControllerService) {
  }

  ngOnInit(): void {
    if (this.requestModel.requestDto.frqId != null) {
      this.fsLookupControllerService.getRequestHistoryUsingGET(this.requestModel.requestDto.frqId).subscribe(
        result => {
          this.histories = result;
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
