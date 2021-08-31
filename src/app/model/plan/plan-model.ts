import { Injectable } from '@angular/core';
import { FundingPlanDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';
import { NciPfrGrantQueryDtoEx } from './nci-pfr-grant-query-dto-ex';
import { RfaPaNcabDate } from '@nci-cbiit/i2ecws-lib/model/rfaPaNcabDate';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  yourgrantsUrl: string;
  eGrantsUrl: string;
  catsConceptUrl: string;
  // allGrants array include 'selected' boolean column with is set on step 1
  allGrants: NciPfrGrantQueryDtoEx[] = [];
  grantsSearchCriteria: Array<RfaPaNcabDate> = [];
  // Data from Step 2
  minimumScore: number;
  maximumScore: number;

  fundingPlanDto: FundingPlanDto = {};


  // TODO: Generate FundingPlanDto and FundingPlanFoasDto

  title = 'New Funding Plan';
  mainApproversCreated = false;
  approverCriteria: any;

  constructor(propertiesService: AppPropertiesService,
              private logger: NGXLogger) {
    // TODO: static properties should be set at app level and shared somehow
    this.grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this.yourgrantsUrl =  propertiesService.getProperty('URL_YOURGRANTS');
    this.eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this.catsConceptUrl = propertiesService.getProperty('CONCEPT_ID_URL');

  }

  reset(): void {
    this.fundingPlanDto = {};
    this.allGrants = [];
    this.grantsSearchCriteria = [];
    this.minimumScore = 0;
    this.maximumScore = 0;
  }

  isMainApproversRegenNeeded(): boolean {
    // always regen for now. needs to figure out the criteria used for plan approvers.
    return true;
//    return this.mainApproversCreated && this.approverCriteriaChanged();
  }

  private approverCriteriaChanged(): boolean {
    const newCriteria = this.makeApproverCriteria();
    // this.logger.debug('new approver criteria ', newCriteria);
    // this.logger.debug('prior approver criteria ', this.approverCriteria);
    return newCriteria.requestType !== this.approverCriteria.requestType
      || newCriteria.cayCode !== this.approverCriteria.cayCode
      || newCriteria.fundingSources !== this.approverCriteria.fundingSources
      || newCriteria.otherDocs !== this.approverCriteria.otherDocs
      || newCriteria.loaCode !== this.approverCriteria.loaCode;
  }

  private makeApproverCriteria(): any {
    const approverCriteria: any = {};
  //  approverCriteria.requestType = this.fundingPlanDto.financialInfoDto.requestTypeId;
    approverCriteria.cayCode = this.fundingPlanDto.cayCode;
    approverCriteria.doc = this.fundingPlanDto.requestorDoc;
    // const fundingSources = Array.from(this.fundingPlanDto.fundingPlanFoas.map());
    // fundingSources.sort(); commented for now to make the order of
    // fundingSources important in determining if approvers need to be regen.
    // approverCriteria.fundingSources = fundingSources.join(',');
    approverCriteria.otherDocs = this.fundingPlanDto.otherContributingDocs;
    approverCriteria.loaCode = this.fundingPlanDto.loaCode;
    // from the create_main_approvers sp, it seems otherDocs has no effect on funding request approvers,
    // only affects funding plan approvers, needs double check with David and Subashini.
    return approverCriteria;
    return null;
  }

  markMainApproversCreated(): void {
    this.approverCriteria = this.makeApproverCriteria();
    this.mainApproversCreated = true;
  }

}
