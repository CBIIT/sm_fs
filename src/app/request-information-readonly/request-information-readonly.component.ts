import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { FundingRequestSkipDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
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
  private tooltipGrant: NciPfrGrantQueryDto;

  constructor(private requestModel: RequestModel, private logger: NGXLogger) {
  }

  otherDocs: string[];
  isSkip: boolean;
  type4Request: boolean;
  diversityRequest: boolean;
  newInvestigator: string;
  showNewInvestigator: boolean;
  supplementType: string;
  skipRequests: FundingRequestSkipDto[];

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

    this.showNewInvestigator = this.requestModel.requestDto.financialInfoDto.newInvestigatorFlag
      && this.requestModel.grant.activityCode === 'R01'
      && ([1, 2].includes(Number(this.requestModel.grant.applTypeCode)));
    this.newInvestigator = this.requestModel.requestDto.financialInfoDto.newInvestigatorFlag;
    if (this.newInvestigator === 'false' || this.newInvestigator === 'true') {
      this.logger.error('New investigator flag is true or false - it should only be \'Y\' or \'N\'.');
    }
    this.logger.debug(this.newInvestigator);

    if (this.newInvestigator === 'Y') {
      this.newInvestigator = 'Yes';
    } else if (this.newInvestigator === 'N') {
      this.newInvestigator = 'No';
    } else {
      this.newInvestigator = '';
    }

    this.skipRequests = this.requestModel.requestDto.skipRequests;
    this.isSkip = this.skipRequests && this.skipRequests.length > 0;
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
