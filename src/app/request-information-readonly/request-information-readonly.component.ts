import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { FundingRequestSkipDto, NciPfrGrantQueryDto } from '@cbiit/i2efsws-lib';
import { FundingRequestTypes } from '../model/request/funding-request-types';
import { NGXLogger } from 'ngx-logger';
import { openNewWindow } from '../utils/utils';

@Component({
  selector: 'app-request-information-readonly',
  templateUrl: './request-information-readonly.component.html',
  styleUrls: ['./request-information-readonly.component.css']
})

export class RequestInformationReadonlyComponent implements OnInit {

  loaMap: Map<string, string>;
  tooltipGrant: FundingRequestSkipDto;
  isPayUsingSkip: boolean;
  otherDocs: string[];
  isSkip: boolean;
  type4Request: boolean;
  is4R00Request: boolean;
  showAltPdAndCayCode: boolean;
  diversityRequest: boolean;
  newInvestigator: string;
  showNewInvestigator: boolean;
  supplementType: string;
  skipRequests: FundingRequestSkipDto[];

  constructor(private requestModel: RequestModel, private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.loaMap = new Map<string, string>()
      .set('PD', 'Program Director')
      .set('DD', 'NCI Director')
      .set('SPL', 'Scientific Program Leaders Committee')
      .set('DAO', 'Division/Office/Center (DOC) Approver');

    if (this.requestModel.requestDto.financialInfoDto.otherDocText) {
      this.otherDocs = this.requestModel.requestDto.financialInfoDto.otherDocText.split(',');
    }
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
    this.is4R00Request = this.requestModel.is4R00();
    this.showAltPdAndCayCode = this.requestModel.isPayType44R00() || this.requestModel.isPayType4K99R00Conversion();

    this.showNewInvestigator = this.requestModel.requestDto.financialInfoDto.newInvestigatorFlag
      && this.requestModel.grant.activityCode === 'R01'
      && ([1, 2].includes(Number(this.requestModel.grant.applTypeCode)));
    this.newInvestigator = this.requestModel.requestDto.financialInfoDto.newInvestigatorFlag;
    if (this.newInvestigator === 'false' || this.newInvestigator === 'true') {
      this.logger.error('New investigator flag is true or false - it should only be \'Y\' or \'N\'.');
    }

    if (this.newInvestigator === 'Y') {
      this.newInvestigator = 'Yes';
    } else if (this.newInvestigator === 'N') {
      this.newInvestigator = 'No';
    } else {
      this.newInvestigator = '';
    }

    this.skipRequests = this.requestModel.requestDto.skipRequests;
    // DMK: FS-1544 - there is a difference between a Skipped grant and Pay Using Skip Funds
    this.isSkip = this.requestModel.isSkip();
    this.isPayUsingSkip = this.requestModel.isPayUsingSkip();
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  openSkipRequest(skipFrqId: number): void {
    openNewWindow('#/request/retrieve/' + skipFrqId, 'SKIP-REQUEST');
  }

  setGrant(grant: NciPfrGrantQueryDto): void {
    this.tooltipGrant = grant;
  }
}
