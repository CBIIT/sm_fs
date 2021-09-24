import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { PlanModel } from '../../model/plan/plan-model';
import { PdCaIntegratorService } from '@nci-cbiit/i2ecui-lib';
import { PlanManagementService } from '../service/plan-management.service';
import {
  FsPlanControllerService,
  FundingPlanFoasDto,
  FundingRequestCanDto
} from '@nci-cbiit/i2ecws-lib';
import { OtherDocsContributingFundsComponent } from '../../other-docs-contributing-funds/other-docs-contributing-funds.component';
import { getCurrentFiscalYear } from '../../utils/utils';
import { FundingPlanInformationComponent } from '../funding-plan-information/funding-plan-information.component';
import { FpFundingInformationComponent } from '../fp-funding-information/fp-funding-information.component';
import { ApplicationsProposedForFundingComponent } from '../applications-proposed-for-funding/applications-proposed-for-funding.component';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { FundingReqBudgetsDto } from '@nci-cbiit/i2ecws-lib/model/fundingReqBudgetsDto';
import { AppUserSessionService } from '../../service/app-user-session.service';
import { PlanApproverService } from '../approver/plan-approver.service';
import { CanManagementService } from '../../cans/can-management.service';

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

  pdNpnId: number;
  cayCode: string;
  doc: string;
  planName: string;
  private nextStep: string;

  get cayCodeArr(): string[] {
    return [this.cayCode];
  }

  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger,
              public planModel: PlanModel,
              private pdCaIntegratorService: PdCaIntegratorService,
              private planCoordinatorService: PlanManagementService,
              private fsPlanControllerService: FsPlanControllerService,
              private planApproverService: PlanApproverService,
              private canManagementService: CanManagementService,
              private userSessionService: AppUserSessionService) {
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

    this.planName = this.planModel.fundingPlanDto.planName;
    this.pdNpnId = this.planModel.fundingPlanDto.requestorNpnId;
    this.cayCode = this.planModel.fundingPlanDto.cayCode;

    this.logger.debug('step 3 plan data', JSON.stringify(this.planModel.fundingPlanDto));
  }

  saveContinue(): void {
    this.nextStep = '/plan/step4';
  }

  saveAsDraft(): void {
    this.nextStep = '/plan/step6';
  }

  previous(): void {
    this.router.navigate(['/plan/step2']);
  }

  onSubmit($event: any): void {
    if (this.step3form.valid) {
      this.buildPlanModel();
      this.fsPlanControllerService.saveFundingPlanUsingPOST(this.planModel.fundingPlanDto).subscribe(result => {
        this.logger.debug('Saved plan model: ', JSON.stringify(result));
        this.planModel.fundingPlanDto = result;
        this.planCoordinatorService.buildPlanModel();
        this.planCoordinatorService.buildGrantCostModel();
        this.planCoordinatorService.buildGrantCostModel();
        this.planCoordinatorService.checkInFlightPFRs(
          this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.map(s => {
            return { applId: s.applId, frtId: s.frtId };
          }));
        this.planApproverService.checkCreateApprovers().finally(
          () => this.router.navigate([this.nextStep]));
      }, error => {
        this.logger.warn(error);
      });
    } else {
      this.logger.debug(this.step3form);
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

    const futureYears: Map<number, number> = new Map<number, number>();
    this.applicationsProposedForFunding.grantList.forEach(item => {
      this.logger.debug('grant thing ==>', item);
      if (!!item.recommendedFutureYearsComponent) {
        const applId = item.grant.applId;
        const recommendedFutureYears: number = item.recommendedFutureYearsComponent.selectedValue || 0;
        this.logger.debug('Retrieved values (applId, recommendedFutureYears) =>', applId, recommendedFutureYears);
        futureYears.set(applId, recommendedFutureYears);
      }
    });

    const fundingSourceDetails: Map<number, FundingRequestFundsSrcDto> = new Map<number, FundingRequestFundsSrcDto>();
    this.applicationsProposedForFunding.fundingSources.forEach((item, index) => {
      if (!!item.sourceDetails()) {
        this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.push(item.sourceDetails());
        fundingSourceDetails.set(index, item.sourceDetails());
      }
    });

    this.fpInfoComponent.listApplicationsNotSelectable.forEach(g => {
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.push(
        {
          applId: g.applId,
          frtId: FundingRequestTypes.FUNDING_PLAN__NOT_SELECTABLE_FOR_FUNDING_PLAN,
          notSelectableReason: g.notSelectableReason,
          nihGuideAddr: '',
          financialInfoDto: {}
        }
      );
    });

    this.fpInfoComponent.listApplicationsSkipped.forEach(g => {
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.push(
        {
          applId: g.applId,
          frtId: FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP,
          notSelectableReason: g.notSelectableReason,
          nihGuideAddr: '',
          financialInfoDto: {}
        }
      );
    });

    this.fpInfoComponent.listApplicationsWithinRange.filter(i => i.selected).forEach(g => {
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.push(
        {
          applId: g.applId,
          frtId: FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE,
          notSelectableReason: g.notSelectableReason,
          nihGuideAddr: '',
          financialInfoDto: {}
        }
      );
    });

    this.fpInfoComponent.listApplicationsOutsideRange.forEach(g => {
      const type = (g.selected ? FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION
        : FundingRequestTypes.FUNDING_PLAN__NOT_PROPOSED_AND_OUTSIDE_FUNDING_PLAN_SCORE_RANGE);
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.push(
        {
          applId: g.applId,
          frtId: type,
          notSelectableReason: g.notSelectableReason,
          nihGuideAddr: '',
          financialInfoDto: {}
        }
      );
    });
    // Build a list of raw data for the request budgets, grouped by applid
    const budgetMap: Map<number, FundingReqBudgetsDto[]> = new Map<number, FundingReqBudgetsDto[]>();
    const canMap: Map<number, FundingRequestCanDto[]> = new Map<number, FundingRequestCanDto[]>();
    let totalRecommendedAmount = 0;
    this.applicationsProposedForFunding.prcList.forEach((item, index) => {
      this.logger.debug('prc item', index, item);
      const source = fundingSourceDetails.get(item.sourceIndex);
      if (!!source) {
        let directCost: number;
        let totalCost: number;
        let percentCut: number | null;
        let dcPercentCut: number;
        let tcPercentCut: number;
        directCost = item.getDirectCost();
        totalCost = item.getTotalCost();
        if (item.displayType === 'percent') {
          percentCut = item.getPercentCut();
          dcPercentCut = percentCut;
          tcPercentCut = percentCut;
        } else {
          percentCut = null;
          dcPercentCut = Number(item.getDirectCostPercentCut()) * 100;
          tcPercentCut = Number(item.getTotalCostPercentCut()) * 100;
        }

        if (!isNaN(totalCost)) {
          totalRecommendedAmount = Number(totalRecommendedAmount) + Number(totalCost);
        }

        let budgets = budgetMap.get(item.grant.applId) as FundingReqBudgetsDto[];
        if (!budgets) {
          budgets = [];
        }
        let cans = canMap.get(item.grant.applId) as FundingRequestCanDto[];
        if (!cans) {
          cans = [];
        }
        budgets.push({
          id: this.planCoordinatorService.getBudget(item.grant.applId, source.fundingSourceId)?.id || null,
          fseId: source.fundingSourceId,
          name: source.fundingSourceName,
          supportYear: 1,
          dcRecAmt: directCost,
          tcRecAmt: totalCost,
        });
        cans.push({
          id: this.planCoordinatorService.getCan(item.grant.applId, source.fundingSourceId)?.id || null,
          approvedDc: directCost,
          approvedTc: totalCost,
          dcPctCut: dcPercentCut,
          tcPctCut: tcPercentCut,
          approvedFutureYrs: futureYears.get(item.grant.applId),
          fseId: source.fundingSourceId,
          defaultOefiaTypeId: source.octId,
          nciSourceFlag: source.nciSourceFlag,
          fundingSourceName: source.fundingSourceName
        });
        budgetMap.set(item.grant.applId, budgets);
        canMap.set(item.grant.applId, cans);
      }
    });
    this.planModel.fundingPlanDto.totalRecommendedAmt = totalRecommendedAmount;

    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(i => {
      i.financialInfoDto.fundingReqBudgetsDtos = budgetMap.get(i.applId);
      i.financialInfoDto.fundingRequestCans = canMap.get(i.applId);
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
      tmp.rfaPaNumber = item.rfaDetails.rfaPaNumber;
      tmp.cptId = item.rfaDetails.cptId;
      tmp.prevRfaPaNumber = item.priorNotice;
      tmp.title = item.rfaDetails.title;
      tmp.councilMeetingDateList = councilDates.get(item.rfaDetails.rfaPaNumber);
      this.planModel.fundingPlanDto.fundingPlanFoas.push(tmp);
    });

    this.planModel.fundingPlanDto.multipleRfaPaFlag = this.planModel.grantsSearchCriteria.length > 1 ? 'Y' : 'N';
    this.planModel.fundingPlanDto.fundableRangeFrom = this.planModel.minimumScore;
    this.planModel.fundingPlanDto.fundableRangeTo = this.planModel.maximumScore;

    // TODO: This next line is wrong.  This is the ldapId of the requesting PD, not the creator of the plan
    this.planModel.fundingPlanDto.requestorLdapId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    this.planModel.fundingPlanDto.planCreateUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;

    // TODO: list of deleted sources

    this.logger.info(JSON.stringify(this.planModel.fundingPlanDto));

  }
}
