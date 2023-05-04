import {Component, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {NavigationStepModel} from 'src/app/funding-request/step-indicator/navigation-step.model';
import {NgForm} from '@angular/forms';
import {PlanModel} from '../../model/plan/plan-model';
import {CustomServerLoggingService, PdCaIntegratorService} from '@cbiit/i2ecui-lib';
import {PlanManagementService} from '../service/plan-management.service';
import {FsPlanControllerService, FundingPlanFoasDto, FundingRequestCanDto, FundingRequestDto} from '@cbiit/i2ecws-lib';
import {
  OtherDocsContributingFundsComponent
} from '../../other-docs-contributing-funds/other-docs-contributing-funds.component';
import {getCurrentFiscalYear, isNumeric} from '../../utils/utils';
import {FundingPlanInformationComponent} from '../funding-plan-information/funding-plan-information.component';
import {FpFundingInformationComponent} from '../fp-funding-information/fp-funding-information.component';
import {
  ApplicationsProposedForFundingComponent
} from '../applications-proposed-for-funding/applications-proposed-for-funding.component';
import {FundingRequestTypes} from '../../model/request/funding-request-types';
import {FundingRequestFundsSrcDto} from '@cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {FundingReqBudgetsDto} from '@cbiit/i2ecws-lib/model/fundingReqBudgetsDto';
import {AppUserSessionService} from '../../service/app-user-session.service';
import {CanManagementService} from '../../cans/can-management.service';
import {Alert} from '../../alert-billboard/alert';
import {FundingSourceGrantDataPayload} from '../applications-proposed-for-funding/funding-source-grant-data-payload';
import {NGXLogger} from 'ngx-logger';

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
  futureYears: Map<number, number> = new Map<number, number>();

  get cayCodeArr(): string[] {
    return [this.cayCode];
  }

  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger,
              private customLogger: CustomServerLoggingService,
              public planModel: PlanModel,
              private pdCaIntegratorService: PdCaIntegratorService,
              private planManagementService: PlanManagementService,
              private fsPlanControllerService: FsPlanControllerService,
              private canManagementService: CanManagementService,
              private userSessionService: AppUserSessionService) {
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);

    this.pdCaIntegratorService.cayCodeEmitter.subscribe(next => {
      if (next.channel === 'PD_CA_DEFAULT_CHANNEL') {
        this.cayCode = typeof next.cayCode === 'string' ? next.cayCode : next.cayCode[0];
        this.planManagementService.fundingSourceValuesEmitter.next({pd: this.pdNpnId, ca: this.cayCode});
      }
    });

    this.pdCaIntegratorService.pdValueEmitter.subscribe(next => {
      if (next.channel === 'PD_CA_DEFAULT_CHANNEL') {
        this.pdNpnId = next.pdId;
        this.planManagementService.fundingSourceValuesEmitter.next({pd: this.pdNpnId, ca: this.cayCode});
      }
    });

    this.pdCaIntegratorService.docEmitter.subscribe(next => {
      if (next.channel === 'PD_CA_DEFAULT_CHANNEL') {
        this.doc = next.doc;
      }
    });

    this.planName = this.planModel.fundingPlanDto.planName;
    this.pdNpnId = this.planModel.fundingPlanDto.requestorNpnId;
    this.cayCode = this.planModel.fundingPlanDto.cayCode;

    const existingRequests = this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.map(r => r.applId) || [];
    const selectedRequests = this.planModel.allGrants.filter(g => g.selected).map(r => r.applId);

    const missingRequests = selectedRequests.filter(f => !existingRequests.includes(f));
    const deletedRequests = existingRequests.filter(f => !selectedRequests.includes(f));

    if (missingRequests && existingRequests.length > 0) {
      this.addMissingGrants(missingRequests);
    }
    if (deletedRequests) {
      this.handleDeletedRequests(deletedRequests);
    }

    this.recalculateFundingRequestTypes();
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

    if (this.step3form.valid && this.planManagementService.unfundedGrants().length === 0) {
      this.scrapePlanData();
      if (this.planManagementService.selectedSourceCount <= 1) {
        this.buildPlanModel();
      } else {
        this.rebuildRecommendedFutureYears();
        this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
          this.logger.debug(`${req.applId}::${JSON.stringify(req)}`);
          req.financialInfoDto.fundingRequestCans?.forEach(can => {
            can.approvedFutureYrs = this.futureYears.get(+req.applId);
            can.requestedFutureYrs = this.futureYears.get(+req.applId);
          });
        });
        this.planModel.fundingPlanDto.totalRecommendedAmt = this.planManagementService.grandTotalTotal();
        this.planModel.fundingPlanDto.directRecommendedAmt = this.planManagementService.grandTotalDirect();
      }
      const year1 = this.planModel.fundingPlanDto.pubYr1SetAsideAmt;
      // TODO: Make sure totalRec is correct for multiple sources
      const totalRec = this.planModel.fundingPlanDto.totalRecommendedAmt;
      if (isNumeric(year1) && isNumeric(totalRec)
        && Math.round(year1) !== Math.round(totalRec)) {
        if (confirm('WARNING: The Program Recommended Total Cost (1st year) in this funding plan does not match the Published 1st year Set-Aside dollar amount. Do you want to proceed with submission?')) {
          this.saveFundingPlan();
        }
      } else {
        this.saveFundingPlan();
      }
    } else {
      this.alerts = [{
        type: 'danger',
        message: 'Please correct the errors identified below.',
        title: ''
      }];

      window.scroll(0, 0);
    }
  }

  private saveFundingPlan(): void {
    // this.logger.debug('Plan before save', this.planModel.fundingPlanDto);
    this.fsPlanControllerService.saveFundingPlan(this.planModel.fundingPlanDto).subscribe(result => {
      // this.logger.debug('Plan after save', result);
      this.planModel.fundingPlanDto = result;
      this.planManagementService.buildPlanBudgetAndCanModel();
      this.planManagementService.buildGrantCostModel();
      this.planManagementService.checkInFlightPFRs(
        this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.map(s => {
          return { applId: s.applId, frtId: s.frtId };
        }));
      if (this.nextStep === '/plan/step6') {
        this.planModel.pendingAlerts.push({
          type: 'success',
          message: 'You have successfully saved your plan',
          title: ''
        });
      }
      this.router.navigate([this.nextStep]);
    }, error => {
      this.customLogger.logErrorWithContext(error.error);
      this.alerts = [{
        type: 'danger',
        message: error.error?.errorMessage || 'Something unexpected went wrong. Technical support has been notified.'
      }];
      window.scrollTo(0, 0);
    });
  }

  buildPlanModel(): void {
    this.scrapePlanData();
    this.buildPlanRequestLists();
    this.buildPlanBudgetAndCanMaps();
  }

  private buildPlanRequestLists(): void {
    this.logger.debug('Build plan request lists');
    if (!this.planModel.fundingPlanDto.fpFinancialInformation) {
      this.planModel.fundingPlanDto.fpFinancialInformation = {};
    }
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests = [];

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
  }

  private buildPlanBudgetAndCanMaps(): void {
    // A little hacky, but I may have added some sources to delete sources BEFORE running this code, so I want to
    // preserve the list.
    const deleteSources: number[] = this.planModel.fundingPlanDto.fpFinancialInformation?.deleteSources;
    const requests: FundingRequestDto[] = this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests;

    this.planModel.fundingPlanDto.fpFinancialInformation = {};
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests = requests;
    this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources = deleteSources;
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources = [];

    this.rebuildRecommendedFutureYears();

    const fundingSourceDetails: Map<number, FundingRequestFundsSrcDto> = new Map<number, FundingRequestFundsSrcDto>();
    this.applicationsProposedForFunding.fundingSources.forEach((item, index) => {
      if (!!item.sourceDetails()) {
        this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.push(item.sourceDetails());
        fundingSourceDetails.set(index, item.sourceDetails());
      }
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
          // Raw percent cut is in human-readable form: 12 rather than .12
          percentCut = item.getPercentCut() * 1000;
          dcPercentCut = percentCut;
          tcPercentCut = percentCut;
        } else {
          percentCut = null;
          dcPercentCut = Number(item.getDirectCostPercentCut()) * 100000;
          tcPercentCut = Number(item.getTotalCostPercentCut()) * 100000;
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
          percentSelected: item.displayType === 'percent' ? true : false,
          approvedFutureYrs: this.futureYears.get(item.grant.applId),
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
  }

  rebuildRecommendedFutureYears(): void {
    this.applicationsProposedForFunding.grantList.forEach(item => {
      if (!!item.recommendedFutureYearsComponent) {
        const applId = item.grant.applId;
        const recommendedFutureYears: number = item.recommendedFutureYearsComponent.selectedValue;
        this.futureYears.set(applId, recommendedFutureYears);
        this.planManagementService.setRecommendedFutureYears(applId, recommendedFutureYears);
      }
    });
  }

  private scrapePlanData(): void {
    if (!this.planModel.fundingPlanDto) {
      this.planModel.fundingPlanDto = {};
    }
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

    $event.forEach(s => {
        this.logger.debug(`Saving values ${JSON.stringify(s)}`);
        if (doOnce) {
          if (this.editing) {
            // Since the user may have changed the funding source, splice it into the list of plan sources.
            this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.splice(this.editing.index, 1, s.fundingSource);
            if (this.editing.sourceId !== s.fundingSource.fundingSourceId) {
              if (!this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources) {
                this.planModel.fundingPlanDto.fpFinancialInformation.deleteSources = [];
              }
            }
          } else {
            this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.push(s.fundingSource);
          }

          doOnce = false;
        }
        let directCost: number;
        let totalCost: number;
        let percentCut: number;
        let dcPercentCut: number;
        let tcPercentCut: number;

        if (s.displayType === 'percent') {
          percentCut = +s.percentCut * 1000;
          directCost = +s.directCostCalculated;
          totalCost = +s.totalCostCalculated;
          dcPercentCut = +s.percentCut * 1000;
          tcPercentCut = +s.percentCut * 1000;
          // this.logger.debug(`percent: ${percentCut}, ${directCost}, ${totalCost}, ${dcPercentCut}, ${tcPercentCut}`);
        } else if (s.displayType === 'dollar') {
          percentCut = +s.percentCut * 1000;
          directCost = +s.directCost;
          totalCost = +s.totalCost;
          dcPercentCut = +s.dcPercentCutCalculated * 100000;
          tcPercentCut = +s.tcPercentCutCalculated * 100000;
          // this.logger.debug(`dollar: ${percentCut}, ${directCost}, ${totalCost}, ${dcPercentCut}, ${tcPercentCut}`);
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

          // This will match on the applid and funding request id.
          // If none found, it's new and we push.
          // Otherwise, we'll update the values in place.
          frBudget = this.findMatchingBudget(req.financialInfoDto.fundingReqBudgetsDtos, this.editing);
          this.logger.debug(`found matching budget: ${JSON.stringify(frBudget)}`);
          let pushBudget = false;

          if (!frBudget) {
            pushBudget = true;
            frBudget = {
              frqId: +req.frqId,
              fseId: +s.fseId,
              id: s.budgetId,
              name: s.fundingSourceName,
              supportYear: +s.supportYear,
              dcRecAmt: +directCost,
              tcRecAmt: +totalCost
              // createDate?: Date;
              // createUserId?: string;
              // id?: number;
            };
          } else {
            frBudget.fseId = +s.fseId;
            frBudget.name = s.fundingSourceName;
            frBudget.supportYear = s.supportYear;
            frBudget.dcRecAmt = +directCost;
            frBudget.tcRecAmt = +totalCost;
          }

          if (this.editing) {
            if (pushBudget) {
              this.logger.debug(`Pushing new budget: ${JSON.stringify(frBudget)}`);
              req.financialInfoDto.fundingReqBudgetsDtos.push(frBudget);
            } else {
              this.logger.debug(`Budget values updated in place`);
            }
          } else {
            req.financialInfoDto.fundingReqBudgetsDtos.push(frBudget);
          }

          frCan = this.findMatchingCan(req.financialInfoDto.fundingRequestCans, this.editing);
          let pushCan = false;
          if (!frCan) {
            pushCan = true;
            frCan = {
              approvedDc: +directCost,
              approvedFutureYrs: futureYears,
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
              id: s.canId,
              nciSourceFlag: s.nciSourceFlag,
              percentSelected: s.displayType === 'percent' ? true : false,
              requestedDc: +directCost,
              requestedFutureYrs: futureYears,
              requestedTc: +totalCost,
              tcPctCut: +tcPercentCut,
            };
          } else {
            frCan.approvedDc = +directCost;
            frCan.requestedDc = +directCost;
            frCan.approvedFutureYrs = futureYears;
            frCan.requestedFutureYrs = futureYears;
            frCan.approvedTc = +totalCost;
            frCan.requestedTc = +totalCost;
            frCan.dcPctCut = +dcPercentCut;
            frCan.tcPctCut = +tcPercentCut;
            frCan.fundingSourceName = s.fundingSourceName;
            frCan.defaultOefiaTypeId = +s.octId;
            frCan.frqId = +req.frqId;
            frCan.fseId = +s.fseId;
            frCan.nciSourceFlag = s.nciSourceFlag;
            frCan.percentSelected = s.displayType === 'percent' ? true : false;
          }

          if (this.editing) {
            if (pushCan) {
              this.logger.debug(`Inserting new CAN: ${JSON.stringify(pushCan)}`);
              req.financialInfoDto.fundingRequestCans.push(frCan);
            } else {
              this.logger.debug('Updating CAN values in place');
            }
          } else {
            req.financialInfoDto.fundingRequestCans.push(frCan);
          }
        });
      }
    );
    this.planManagementService.buildPlanBudgetAndCanModel();
    this.planModel.fundingPlanDto.totalRecommendedAmt = this.planManagementService.grandTotalTotal();
    this.planModel.fundingPlanDto.directRecommendedAmt = this.planManagementService.grandTotalDirect();
    this.planManagementService.clearPendingValues();
  }

  deleteFundingSource($event: number): void {
    this.planManagementService.clearPendingValues();

    if (!this.planModel.fundingPlanDto || !this.planModel.fundingPlanDto.fpFinancialInformation) {
      return;
    }

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
  }

  beforeEditFundingSource($event: { sourceId: number; index: number }): void {
    this.planManagementService.clearPendingValues();
    this.editing = $event;
  }

  cancelAddFundingSource(): void {
    this.planManagementService.clearPendingValues();
    this.clearEditFlag();
  }

  onSelectedValueChange($event: string | string[]): void {
    if (typeof $event === 'string') {
      this.cayCode = $event;
    } else {
      this.cayCode = $event ? $event[0] : undefined;
    }
  }

  clearEditFlag(): void {
    this.editing = undefined;
  }

  private findMatchingBudget(fundingReqBudgetsDtos: Array<FundingReqBudgetsDto>, editing: { sourceId: number; index: number }): FundingReqBudgetsDto {
    let result: FundingReqBudgetsDto = null;

    result = fundingReqBudgetsDtos.find(bud => +bud.fseId === +editing?.sourceId);

    return result;
  }

  private findMatchingCan(fundingRequestCans: Array<FundingRequestCanDto>, editing: { sourceId: number; index: number }): FundingRequestCanDto {
    let result: FundingRequestCanDto = null;
    result = fundingRequestCans.find(can => +can.fseId === +editing?.sourceId);
    return result;
  }

  private addMissingGrants(missingRequests: number[]): void {
    const listApplicationsWithinRange = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore).map(x => x.applId);

    missingRequests.forEach(applid => {
      this.logger.info(`Adding newly selected grant [${applid}] to plan ${this.planModel.fundingPlanDto.fprId}`);
      const inRange: boolean = listApplicationsWithinRange.includes(applid);
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.push(
        {
          frqId: null,
          applId: applid,
          fprId: this.planModel.fundingPlanDto.fprId,
          frtId: (inRange ? FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE
            : FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION),
          notSelectableReason: null,
          nihGuideAddr: '',
          financialInfoDto: {}
        }
      );
    });
  }

  private handleDeletedRequests(deletedRequests: number[]): void {
    const listApplicationsWithinRange = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore).map(x => x.applId);

    deletedRequests.forEach(applid => {
      this.logger.info(`Purge data for applid: ${applid} from plan ${this.planModel.fundingPlanDto.fprId}`);
      const inRange: boolean = listApplicationsWithinRange.includes(applid);

      const fr: FundingRequestDto = this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.find(r => r.applId === applid);
      if (fr) {
        fr.frtId = (inRange ? FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP
          : FundingRequestTypes.FUNDING_PLAN__NOT_PROPOSED_AND_OUTSIDE_FUNDING_PLAN_SCORE_RANGE);
        fr.financialInfoDto.requestTypeId = fr.frtId;
      } else {
        this.logger.warn(`No funding request found for for applId ${applid} in plan ${this.planModel.fundingPlanDto.fprId}`);
      }
    });
  }

  private recalculateFundingRequestTypes(): void {
    const from = this.planModel.fundingPlanDto?.fundableRangeFrom;
    const to = this.planModel.fundingPlanDto?.fundableRangeTo;
    const grantsInRange = this.planModel.allGrants.filter(g => g.priorityScoreNum >= from && g.priorityScoreNum <= to).map(g => g.applId);
    const selectedGrants = this.planModel.allGrants.filter(g => g.selected).map(g => g.applId);
    this.planModel.fundingPlanDto.fpFinancialInformation?.fundingRequests?.forEach(req => {
      const inRange: boolean = grantsInRange.includes(req.applId);
      const selected: boolean = selectedGrants.includes(req.applId);
      this.logger.debug(`Grant: ${req.applId} :: inRange: ${inRange} :: selected: ${selected}`);
      if (inRange && selected) {
        req.frtId = FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE;
      } else if (selected) {
        req.frtId = FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION;
      }
    });
  }
}
