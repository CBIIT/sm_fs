import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { PlanModel } from '../../model/plan/plan-model';
import { PdCaIntegratorService } from '@nci-cbiit/i2ecui-lib';
import { PlanManagementService } from '../service/plan-management.service';
import { FsPlanControllerService, FundingPlanFoasDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { OtherDocsContributingFundsComponent } from '../../other-docs-contributing-funds/other-docs-contributing-funds.component';
import { getCurrentFiscalYear, isReallyANumber } from '../../utils/utils';
import { FundingPlanInformationComponent } from '../funding-plan-information/funding-plan-information.component';
import { FpFundingInformationComponent } from '../fp-funding-information/fp-funding-information.component';
import { ApplicationsProposedForFundingComponent } from '../applications-proposed-for-funding/applications-proposed-for-funding.component';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { FundingReqBudgetsDto } from '@nci-cbiit/i2ecws-lib/model/fundingReqBudgetsDto';
import { AppUserSessionService } from '../../service/app-user-session.service';
import { PlanApproverService } from '../approver/plan-approver.service';
import { CanManagementService } from '../../cans/can-management.service';
import { Alert } from '../../alert-billboard/alert';
import { FundingSourceGrantDataPayload } from '../applications-proposed-for-funding/funding-source-grant-data-payload';

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
  alerts: Alert[];
  private editing: { sourceId: number; index: number };

  get cayCodeArr(): string[] {
    return [this.cayCode];
  }

  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger,
              public planModel: PlanModel,
              private pdCaIntegratorService: PdCaIntegratorService,
              private planManagementService: PlanManagementService,
              private fsPlanControllerService: FsPlanControllerService,
              private planApproverService: PlanApproverService,
              private canManagementService: CanManagementService,
              private userSessionService: AppUserSessionService) {
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);

    this.pdCaIntegratorService.cayCodeEmitter.subscribe(next => {
      // this.logger.debug('new cayCode received');
      this.cayCode = typeof next === 'string' ? next : next[0];
      this.planManagementService.fundingSourceValuesEmitter.next({ pd: this.pdNpnId, ca: this.cayCode });
    });
    this.pdCaIntegratorService.pdValueEmitter.subscribe(next => {
      // this.logger.debug('new PD received');
      this.pdNpnId = next;
      this.planManagementService.fundingSourceValuesEmitter.next({ pd: this.pdNpnId, ca: this.cayCode });
    });


    this.pdCaIntegratorService.docEmitter.subscribe(next => {
      // this.logger.debug('new DOC: ', next);
      this.doc = next;
    });

    this.planName = this.planModel.fundingPlanDto.planName;
    this.pdNpnId = this.planModel.fundingPlanDto.requestorNpnId;
    this.cayCode = this.planModel.fundingPlanDto.cayCode;

    // this.planCoordinatorService.listSelectedSources = [];
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
    this.alerts = null;
    // this.logger.debug($event);
    if (this.step3form.valid) {
      if (this.planManagementService.selectedSourceCount <= 1) {
        this.buildPlanModel();
      }
      const year1 = this.planModel.fundingPlanDto.pubYr1SetAsideAmt;
      // TODO: Make sure totalRec is correct for multiple sources
      const totalRec = this.planModel.fundingPlanDto.totalRecommendedAmt;
      if (isReallyANumber(year1) && isReallyANumber(totalRec)
        && Math.round(year1) !== Math.round(totalRec)) {
        if (confirm('WARNING: The Program Recommended Total Cost (1st year) in this funding plan does not match the Published 1st year Set-Aside dollar amount. Do you want to proceed with submission?')) {
          this.saveFundingPlan();
        }
      } else {
        this.saveFundingPlan();
      }
    } else {
      // push an alert here
      this.alerts = [{
        type: 'danger',
        message: 'Please correct the errors identified below.',
        title: ''
      }];

      window.scroll(0, 0);
    }
  }

  private saveFundingPlan(): void {
    this.fsPlanControllerService.saveFundingPlanUsingPOST(this.planModel.fundingPlanDto).subscribe(result => {
      this.logger.debug('Saved plan model: ', JSON.stringify(result));
      this.planModel.fundingPlanDto = result;
      this.planManagementService.buildPlanBudgetAndCanModel();
      this.planManagementService.buildGrantCostModel();
      this.planManagementService.checkInFlightPFRs(
        this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.map(s => {
          return { applId: s.applId, frtId: s.frtId };
        }));
      this.planApproverService.checkCreateApprovers().finally(
        () => {
          if (this.nextStep === '/plan/step6') {
            this.planModel.pendingAlerts.push({
              type: 'success',
              message: 'You have successfully saved your request',
              title: ''
            });
          }
          this.router.navigate([this.nextStep]);
        });
    }, error => {
      this.logger.warn(error);
    });
  }

  buildPlanModel(): void {
    this.planModel.fundingPlanDto.planName = this.planName;
    if (!this.planModel.fundingPlanDto.planFy) {
      this.planModel.fundingPlanDto.planFy = getCurrentFiscalYear();
    }

    this.planModel.fundingPlanDto.requestorDoc = this.doc;
    this.planModel.fundingPlanDto.requestorNpnId = this.pdNpnId;
    this.planModel.fundingPlanDto.requestorNpeId = null;
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

    // A little hacky, but I may have added some sources to delete sources BEFORE running this code, so I want to
    // preserve the list.
    const deleteSources: number[] = this.planModel.fundingPlanDto.fpFinancialInformation?.deleteSources;
    this.planModel.fundingPlanDto.fpFinancialInformation = {};
    this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources = deleteSources;
    this.planModel.fundingPlanDto.fpFinancialInformation.fiscalYear = this.planModel.fundingPlanDto.planFy || getCurrentFiscalYear();
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources = [];
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests = [];

    const futureYears: Map<number, number> = new Map<number, number>();
    this.applicationsProposedForFunding.grantList.forEach(item => {
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
          frqId: this.planManagementService.requestIdMap.get(g.applId),
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
          frqId: this.planManagementService.requestIdMap.get(g.applId),
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
          frqId: this.planManagementService.requestIdMap.get(g.applId),
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
          frqId: this.planManagementService.requestIdMap.get(g.applId),
          applId: g.applId,
          frtId: type,
          notSelectableReason: g.notSelectableReason,
          nihGuideAddr: '',
          financialInfoDto: {}
        }
      );
    });
    // ===========================================================================================
    // ===========================================================================================
    // Build a list of raw data for the request budgets, grouped by applid
    const budgetMap: Map<number, FundingReqBudgetsDto[]> = new Map<number, FundingReqBudgetsDto[]>();
    const canMap: Map<number, FundingRequestCanDto[]> = new Map<number, FundingRequestCanDto[]>();
    let totalRecommendedAmount = 0;
    let directRecommendedAmount = 0;
    this.applicationsProposedForFunding.prcList.forEach((item, index) => {
      // this.logger.debug('prc item', index, item);
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
        if (!isNaN(directCost)) {
          directRecommendedAmount = Number(directRecommendedAmount) + Number(directCost);
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
          // TODO: this is the source of the duplication
          id: this.planManagementService.getBudget(item.grant.applId, source.fundingSourceId)?.id || null,
          fseId: source.fundingSourceId,
          name: source.fundingSourceName,
          supportYear: item.grant.supportYear,
          dcRecAmt: directCost,
          tcRecAmt: totalCost,
        });
        cans.push({
          // TODO: this is the source of the duplication
          id: this.planManagementService.getCan(item.grant.applId, source.fundingSourceId)?.id || null,
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
    this.planModel.fundingPlanDto.directRecommendedAmt = directRecommendedAmount;

    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(i => {
      i.financialInfoDto.fundingReqBudgetsDtos = budgetMap.get(i.applId);
      i.financialInfoDto.fundingRequestCans = canMap.get(i.applId);
    });
    // ====================================================================================
    // ====================================================================================


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

    // TODO: transform ncabDates from YYYYMM to MM/YYYY format for saving
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

  beforeAddFundingSource($event: number): void {
    this.logger.debug('Add funding source:', $event);
    if (+$event === 1) {
      this.buildPlanModel();
    }
  }

  addFundingSource($event: FundingSourceGrantDataPayload[]): void {
    let frBudget: FundingReqBudgetsDto;
    let frCan: FundingRequestCanDto;
    let doOnce = true;
    // If we are editing a source, delete it first, then insert the new values below
    if (this.editing) {
      this.deleteFundingSource(this.editing.sourceId);
    }
    $event.forEach(s => {
        this.logger.debug(s);
        if (doOnce) {
          this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.push(s.fundingSource);
          doOnce = false;
        }
        let directCost: number;
        let totalCost: number;
        let percentCut: number;
        let dcPercentCut: number;
        let tcPercentCut: number;

        if (s.displayType === 'percent') {
          percentCut = +s.percentCut;
          directCost = +s.directCostCalculated;
          totalCost = +s.totalCostCalculated;
          dcPercentCut = +s.percentCut * 100;
          tcPercentCut = +s.percentCut * 100;
        } else if (s.displayType === 'dollar') {
          percentCut = +s.percentCut * 100;
          directCost = +s.directCost;
          totalCost = +s.totalCost;
          dcPercentCut = +s.dcPercentCutCalculated * 100;
          tcPercentCut = +s.tcPercentCutCalculated * 100;
        } else {
          this.logger.error('Display type is null. Time to panic.');
        }

        this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.filter(r => +r.applId === +s.applId).forEach(req => {
          if (!req.financialInfoDto.fundingReqBudgetsDtos) {
            req.financialInfoDto.fundingReqBudgetsDtos = new Array<FundingReqBudgetsDto>();
          }
          if (!req.financialInfoDto.fundingRequestCans) {
            req.financialInfoDto.fundingRequestCans = new Array<FundingRequestCanDto>();
          }

          const futureYears: number = this.planManagementService.getRecommendedFutureYears(s.applId);

          frBudget = {
            frqId: +req.frqId,
            fseId: +s.fseId,
            id: null, // this is new so ID shouldn't exist
            name: s.fundingSourceName,
            supportYear: +s.supportYear,
            dcRecAmt: +directCost,
            tcRecAmt: +totalCost
            // createDate?: Date;
            // createUserId?: string;
            // id?: number;
          };

          if (this.editing) {
            req.financialInfoDto.fundingReqBudgetsDtos.splice(this.editing.index, 0, frBudget);
          } else {
            req.financialInfoDto.fundingReqBudgetsDtos.push(frBudget);
          }

          frCan = {
            approvedDc: +directCost,
            approvedFutureYrs: +futureYears,
            approvedTc: +totalCost,
            can: null,  // Solve for edits
            canDescription: null, // solve for edits
            createDate: null,
            createUserId: null,
            dcPctCut: +dcPercentCut,
            defaultOefiaTypeId: +s.octId, // solve for edits
            frqId: +req.frqId,
            fseId: +s.fseId,
            fundingSourceName: s.fundingSourceName,
            id: null, // solve for edits
            // lastChangeDate: string,
            // lastChangeUserId: string,
            nciSourceFlag: s.nciSourceFlag,
            // octId: s.octId,
            // oefiaCreateCode: string,
            // oefiaTypeId: number,
            // oefiaTypeIds: string,
            // phsOrgCode: string,
            // previousAfy: number,
            // reimburseableCode: string,
            requestedDc: +directCost,
            requestedFutureYrs: +futureYears,
            requestedTc: +totalCost,
            tcPctCut: +tcPercentCut,
            // updateStamp: number,
          };

          if (this.editing) {
            req.financialInfoDto.fundingRequestCans.splice(this.editing.index, 0, frCan);
          } else {
            req.financialInfoDto.fundingRequestCans.push(frCan);
          }
        });
      }
    );
    this.planManagementService.buildPlanBudgetAndCanModel();
    this.planModel.fundingPlanDto.totalRecommendedAmt = this.planManagementService.grandTotalTotal();
    this.planModel.fundingPlanDto.directRecommendedAmt = this.planManagementService.grandTotalDirect();
  }

  deleteFundingSource($event: number): void {
    this.logger.debug('delete funding source:', $event);

    // STEP 1 - remove the source from the list of selected sources and add to delete list
    if (!this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources) {
      this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources = [];
    }
    this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources.push(+$event);

    this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources =
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.filter(s => +s.fundingSourceId !== +$event);

    this.planManagementService.recalculateRestrictedSources();

    // STEP 2 - remove the budgets and CANs for that source
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      req.financialInfoDto.fundingRequestCans = req.financialInfoDto.fundingRequestCans?.filter(c => +c.fseId !== +$event);
      req.financialInfoDto.fundingReqBudgetsDtos = req.financialInfoDto.fundingReqBudgetsDtos?.filter(b => +b.fseId !== +$event);
    });

    // STEP 3 - rebuild the budget and CAN model
    this.planManagementService.buildPlanBudgetAndCanModel();
    this.planModel.fundingPlanDto.totalRecommendedAmt = this.planManagementService.grandTotalTotal();
    this.planModel.fundingPlanDto.directRecommendedAmt = this.planManagementService.grandTotalDirect();
    // this.logger.debug('initialize children');
    // this.applicationsProposedForFunding.initializeChildren();
  }

  beforeEditFundingSource($event: { sourceId: number; index: number }): void {
    this.editing = $event;
  }

  cancelAddFundingSource(): void {
    this.editing = undefined;
  }
}
