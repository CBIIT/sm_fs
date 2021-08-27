import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { PlanModel } from '../../model/plan/plan-model';
import { PdCaIntegratorService } from '@nci-cbiit/i2ecui-lib';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { FsPlanControllerService, FsRequestControllerService, FundingPlanFoasDto } from '@nci-cbiit/i2ecws-lib';
import { OtherDocsContributingFundsComponent } from '../../other-docs-contributing-funds/other-docs-contributing-funds.component';
import { getCurrentFiscalYear } from '../../utils/utils';
import { FundingPlanInformationComponent } from '../funding-plan-information/funding-plan-information.component';
import { FpFundingInformationComponent } from '../fp-funding-information/fp-funding-information.component';
import { ApplicationsProposedForFundingComponent } from '../applications-proposed-for-funding/applications-proposed-for-funding.component';

@Component({
  selector: 'app-plan-step3',
  templateUrl: './plan-step3.component.html',
  styleUrls: ['./plan-step3.component.css']
})
export class PlanStep3Component implements OnInit {
  @ViewChild('step3form', { static: false }) step3form: NgForm;
  @ViewChild(OtherDocsContributingFundsComponent) otherDocs: OtherDocsContributingFundsComponent;
  @ViewChild(FundingPlanInformationComponent) fpInfoComponent: FundingPlanInformationComponent;
  @ViewChild(FpFundingInformationComponent) fpFundingInfoComponent: FpFundingInformationComponent;
  @ViewChild(ApplicationsProposedForFundingComponent) applicationsProposedForFunding: ApplicationsProposedForFundingComponent;

  private pdNpnId: number;
  private cayCode: string;
  private doc: string;
  planName: string;

  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger,
              private planModel: PlanModel,
              private pdCaIntegratorService: PdCaIntegratorService,
              private planCoordinatorService: PlanCoordinatorService,
              private fsPlanControllerService: FsPlanControllerService) {
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);
    this.pdCaIntegratorService.pdValueEmitter.subscribe(next => {
      this.pdNpnId = next;
      this.planCoordinatorService.fundingSourceValuesEmitter.next({ pd: this.pdNpnId, ca: this.cayCode });
    });
    this.pdCaIntegratorService.cayCodeEmitter.subscribe(next => {
      this.cayCode = typeof next === 'string' ? next : next[0];
      this.planCoordinatorService.fundingSourceValuesEmitter.next({ pd: this.pdNpnId, ca: this.cayCode });
    });
    this.pdCaIntegratorService.docEmitter.subscribe(next => {
      this.doc = next;
    });
  }

  saveContinue(): void {
  }

  previous(): void {
    this.router.navigate(['/plan/step2']);
  }

  onSubmit($event: any): void {
    if (this.step3form.valid) {
      this.buildPlanModel();
      // this.fsPlanControllerService.saveFundingPlanUsingPOST(this.planModel.fundingPlanDto).subscribe(result => {
      //   this.logger.debug('Saved plan model: ', JSON.stringify(result));
      //   this.planModel.fundingPlanDto = result;
      //   this.router.navigate(['/plan/step4']);
      // }, error => {
      //   this.logger.warn(error);
      // });
    }
  }

  buildPlanModel(): void {
    this.logger.debug('Building plan model');
    this.planModel.fundingPlanDto.planName = this.planName;
    if (!this.planModel.fundingPlanDto.planFy) {
      this.planModel.fundingPlanDto.planFy = getCurrentFiscalYear();
    }

    this.planModel.fundingPlanDto.requestorDoc = this.doc;
    this.planModel.fundingPlanDto.requestorNpnId = this.pdNpnId;
    this.planModel.fundingPlanDto.cayCode = this.cayCode;

    this.planModel.fundingPlanDto.otherContributingDocs = this.otherDocs.selectedValue;

    this.planModel.fundingPlanDto.applNotConsideredNum = this.fpInfoComponent.totalApplicationsNotConsidered;
    this.planModel.fundingPlanDto.applProposedNum = this.fpInfoComponent.totalApplicationsSelected;
    this.planModel.fundingPlanDto.applReceivedNum = this.fpInfoComponent.totalApplicationsReceived;
    this.planModel.fundingPlanDto.applSkipNum = this.fpInfoComponent.totalApplicationsSkipped;

    this.planModel.fundingPlanDto.pubYr1SetAsideAmt = this.fpFundingInfoComponent.firstYearSetAside;
    this.planModel.fundingPlanDto.totalPubSetAsideAmt = this.fpFundingInfoComponent.totalSetAside;
    this.planModel.fundingPlanDto.fundingEstYr2Amt = this.fpFundingInfoComponent.outYear2;
    this.planModel.fundingPlanDto.fundingEstYr3Amt = this.fpFundingInfoComponent.outYear3;
    this.planModel.fundingPlanDto.fundingEstYr4Amt = this.fpFundingInfoComponent.outYear4;
    this.planModel.fundingPlanDto.fundingEstYr5Amt = this.fpFundingInfoComponent.outYear5;

    this.planModel.fundingPlanDto.comments = this.applicationsProposedForFunding.comments;

    this.planModel.fundingPlanDto.fpFinancialInformation = {};
    this.planModel.fundingPlanDto.fpFinancialInformation.fiscalYear = this.planModel.fundingPlanDto.planFy || getCurrentFiscalYear();
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources = [];
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests = [];
    this.applicationsProposedForFunding.fundingSources.forEach((item, index) => {
      this.logger.debug('=====>', index, item);
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.push(item.sourceDetails());
    });
    this.applicationsProposedForFunding.grantList.forEach((item, index) => {
      // TODO: Build FP grant list: skip, exception, not selected
      this.logger.debug('<=====>', index, item);
    });
    this.applicationsProposedForFunding.prcList.forEach((item, index) => {
      this.logger.debug('<=====', index, item);
    });

    const bmmCodes: string[] = [];
    const activityCodes: string[] = [];
    this.applicationsProposedForFunding.listGrantsSelected.forEach(g => {
      if (!activityCodes.includes(g.activityCode)) {
        if (!!g.activityCode) {
          activityCodes.push(g.activityCode);
        }
      }
      if (!bmmCodes.includes(g.bmmCode)) {
        if (!!g.bmmCode) {
          bmmCodes.push(g.bmmCode);
        }
      }
    });

    this.planModel.fundingPlanDto.bmmCodeList = bmmCodes.join();

    const councilDates: Map<string, string> =
      new Map(this.planModel.grantsSearchCriteria.map(val => [val.rfaPaNumber, val.ncabDates.join()]));

    this.planModel.fundingPlanDto.fundingPlanFoas = [];
    this.fpInfoComponent.planFoaDetails.forEach(item => {
      const tmp: FundingPlanFoasDto = {};
      tmp.activityCodeList = activityCodes.join();
      tmp.issueType = item.issueType;
      tmp.nihGuideAddr = item.rfaDetails.nihGuideAddr;
      tmp.rfaPaNumber = item.rfaDetails.noticeNumber;
      tmp.cptId = item.rfaDetails.cptId;
      tmp.prevRfaPaNumber = item.rfaDetails.priorNoticeNumber;
      tmp.title = item.rfaDetails.title;
      tmp.councilMeetingDateList = councilDates.get(item.rfaDetails.noticeNumber);
      this.planModel.fundingPlanDto.fundingPlanFoas.push(tmp);
    });

    this.planModel.fundingPlanDto.multipleRfaPaFlag = this.planModel.grantsSearchCriteria.length > 1 ? 'Y' : 'N';
    this.planModel.fundingPlanDto.fundableRangeFrom = this.planModel.minimumScore;
    this.planModel.fundingPlanDto.fundableRangeTo = this.planModel.maximumScore;

    this.logger.info(JSON.stringify(this.planModel.fundingPlanDto));

  }
}
