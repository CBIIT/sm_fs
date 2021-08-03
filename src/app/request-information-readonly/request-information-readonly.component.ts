import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { FundingRequestSkipDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { FundingRequestTypes } from '../model/request/funding-request-types';

@Component({
  selector: 'app-request-information-readonly',
  templateUrl: './request-information-readonly.component.html',
  styleUrls: ['./request-information-readonly.component.css']
})

export class RequestInformationReadonlyComponent implements OnInit {

  loaMap: any;

  constructor(private requestModel: RequestModel) {
  }

  otherDocs: string[];
  isSkip: boolean;
  type4Request: boolean;
  diversityRequest: boolean;
  newInvestigator: string;
  supplementType: string;
  skipRequests: FundingRequestSkipDto[];

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
    this.type4Request = this.requestModel.requestDto?.financialInfoDto?.requestTypeId
      === FundingRequestTypes.PAY_TYPE_4;
    this.diversityRequest = this.requestModel.requestDto?.financialInfoDto?.requestTypeId
      === FundingRequestTypes.DIVERSITY_SUPPLEMENT_INCLUDES_CURE_SUPPLEMENTS;
    if (this.diversityRequest) {
      if (this.requestModel.requestDto?.financialInfoDto?.suppNewFlag === 'Y') {
        this.supplementType = 'New';
      } else if (this.requestModel.requestDto?.financialInfoDto?.suppAddYearFlag === 'Y') {
        this.supplementType = 'Additional Year (Extension)';
      }
    }

    this.newInvestigator = this.requestModel.requestDto.financialInfoDto.newInvestigatorFlag;
    if (this.newInvestigator === 'true' || this.newInvestigator === 'Y') {
      this.newInvestigator = 'Yes';
    }
    else {
      this.newInvestigator = 'No';
    }
    if (this.isSkip) {
      this.skipRequests = this.requestModel.requestDto.skipRequests;
    }
    console.log('blablabla', this);
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

}
