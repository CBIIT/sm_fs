import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-request-information-readonly',
  templateUrl: './request-information-readonly.component.html',
  styleUrls: ['./request-information-readonly.component.css']
})

export class RequestInformationReadonlyComponent implements OnInit {

  loaMap: any;
  constructor(private requestModel: RequestModel) { }

  otherDocs: string[];
  isSkip: boolean;

  ngOnInit(): void {
    this.loaMap = new Map<string, string>()
    .set('PD', 'Program Director')
    .set('DD', 'NCI Director')
    .set('SPL', 'Scientific Program Leaders Committee')
    .set('DAO', 'Division/Office/Center Approver');

    if (this.requestModel.requestDto.financialInfoDto.otherDocText) {
      this.otherDocs = this.requestModel.requestDto.financialInfoDto.otherDocText.split(',');
    }
    this.isSkip = this.requestModel.isSkip();
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

}
