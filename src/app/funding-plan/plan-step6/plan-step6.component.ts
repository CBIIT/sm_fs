import { AfterViewInit, ChangeDetectorRef, Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { CancerActivityControllerService, DocumentsDto, FsPlanControllerService, FsPlanWorkflowControllerService,
  FundingReqApproversDto, FundingReqStatusHistoryDto,
  FundingRequestQueryDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { FundingRequestIntegrationService } from 'src/app/funding-request/integration/integration.service';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { WorkflowModalComponent } from 'src/app/funding-request/workflow-modal/workflow-modal.component';
import { ApprovingStatuses, RequestStatus, WorkflowActionCode, WorkflowModel } from 'src/app/funding-request/workflow/workflow.model';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { AppPropertiesService } from 'src/app/service/app-properties.service';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { PlanWorkflowComponent } from '../fp-workflow/plan-workflow.component';
import { NgForm } from '@angular/forms';
import { DocTypeConstants } from './plan-supporting-docs-readonly/plan-supporting-docs-readonly.component';
import { UploadBudgetDocumentsComponent } from 'src/app/upload-budget-documents/upload-budget-documents.component';
import { CanManagementService } from '../../cans/can-management.service';
import { FpBudgetInformationComponent } from '../fp-budget-information/fp-budget-information.component';

@Component({
  selector: 'app-plan-step6',
  templateUrl: './plan-step6.component.html',
  styleUrls: ['./plan-step6.component.css'],
  providers: [WorkflowModel]
})
export class PlanStep6Component implements OnInit, AfterViewInit {
  @ViewChild(WorkflowModalComponent) workflowModal: WorkflowModalComponent;
  @ViewChild(PlanWorkflowComponent) workflowComponent: PlanWorkflowComponent;
  @ViewChild(UploadBudgetDocumentsComponent) uploadBudgetDocumentsComponent: UploadBudgetDocumentsComponent;
//  @ViewChild(FpBudgetInformationComponent) budgetInfoComponent: FpBudgetInformationComponent;
  @ViewChildren(FpBudgetInformationComponent) budgetInfoComponents: QueryList<FpBudgetInformationComponent>
//    public Grids: QueryList<GridComponent>
  grantsSkipped: NciPfrGrantQueryDtoEx[] = [];
  grantsNotConsidered: NciPfrGrantQueryDtoEx[] = [];

  inFlightProposed: FundingRequestQueryDto[];
  inFlightSkipped: FundingRequestQueryDto[];

  statusesCanWithdraw = ['SUBMITTED', 'ON HOLD', 'APPROVED', 'AWC', 'DEFER',
    'RELEASED', 'DELEGATED', 'ROUTED', 'REASSIGNED'];
  statusesCanOnHold = ['SUBMITTED', 'APPROVED', 'AWC', 'DEFER',
    'RELEASED', 'DELEGATED', 'ROUTED', 'REASSIGNED'];
  statusesCanEditSubmit = ['DRAFT', 'WITHDRAWN', 'RFC'];
  terminalStatus = ['COMPLETED', 'REJECTED'];

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  isRequestEverSubmitted = false;
  requestHistorySubscriber: Subscription;
  activeApproverSubscriber: Subscription;
  // submissionResult: { status: 'success' | 'failure' | '', frqId?: number, approver?: FundingReqApproversDto, errorMessage?: string }
  //   = { status: '' };
  requestStatus: string;
  docDtos: DocumentsDto[];
  excludedDocDtos: DocumentsDto[];
  readonly = false;
  activeApprover: FundingReqApproversDto;

  userCanSubmit = false;
  userCanDelete = false;
  userReadonly = true;
  closeResult: string;
  docChecker: FundingPlanDocChecker;

  private fprId: number;

  constructor(private navigationModel: NavigationStepModel,
              private propertiesService: AppPropertiesService,
              private userSessionService: AppUserSessionService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private fsPlanWorkflowControllerService: FsPlanWorkflowControllerService,
              private fsPlanControllerService: FsPlanControllerService,
              private cancerActivityService: CancerActivityControllerService,
              public planModel: PlanModel,
              private canManagementService: CanManagementService,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger,
              private changeDetection: ChangeDetectorRef,
              private router: Router) { }


  ngAfterViewInit(): void {
    if (this.uploadBudgetDocumentsComponent && this.workflowComponent) {
      this.workflowComponent.uploadBudgetDocumentsComponent = this.uploadBudgetDocumentsComponent;
    }

    this.budgetInfoComponents.changes.subscribe(
      (comps: QueryList <FpBudgetInformationComponent>) => {
        this.workflowComponent.budgetInfoComponent = comps.first;
      });

    if (this.planModel.pendingAlerts.length > 0) {
        const el = document.getElementById('funding-plan-page-top');
        el.scrollIntoView();
    }
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(6, true);
    this.fprId = this.planModel.fundingPlanDto.fprId;
    this.requestHistorySubscriber = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );

    this.grantsSkipped = this.planModel.allGrants.filter( g =>
      ( !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
      g.priorityScoreNum >= this.planModel.minimumScore &&
      g.priorityScoreNum <= this.planModel.maximumScore) );
    // this.logger.debug('skipped grants are ', this.grantsSkipped);

    this.grantsNotConsidered = this.planModel.allGrants.filter(g =>
      (g.notSelectableReason && g.notSelectableReason.length > 0) ||
      (( g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore)
      && !g.selected ) );
    // this.logger.debug('unfunded grants are ', this.grantsNotConsidered);
    // this.planApproverService.checkCreateApprovers().then( () => {
    //   this.logger.debug('Approvers are created ');
    this.workflowModel.initializeForPlan(this.fprId);
      // }
      // );
    // this.logger.debug('Step6 OnInit Plan Model ', this.planModel);
    this.checkUserRolesCas();
    this.docChecker = new FundingPlanDocChecker(this.planModel);
    this.isDocsStepCompleted();
    this.checkInFlightPfr();
    this.canManagementService.initializeCANDisplayMatrix();
  }

  private isDocsStepCompleted(): void {
    if (this.docChecker.docMissing) {
      this.navigationModel.setStepComplete(5, false);
    } else {
      this.navigationModel.setStepComplete(5, true);
    }
  }

  checkInFlightPfr(): void {
    this.inFlightSkipped = [];
    this.inFlightProposed = [];
    this.fsPlanControllerService.getInFlightPFRsUsingGET(this.fprId).subscribe(
      result => {
        result.forEach( r => {
          if (this.isSkip(r)) {
            this.inFlightSkipped.push(r);
          }
          else {
            this.inFlightProposed.push(r);
          }
        }
        );
      },
      error => {
        this.logger.error('calling getInFlightPFR failed ', error);
      }
    );
  }

  isSkip(r: FundingRequestQueryDto): boolean {
    if (this.grantsSkipped && this.grantsSkipped.length > 0) {
      for (const g of this.grantsSkipped) {
        if (g.applId === r.applId) { return true; }
      }
    }
    return false;
  }

  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    let submitted = false;
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      if (item.statusCode === 'SUBMITTED') {
        submitted = true;
      }
      if (!item.endDate) {
        this.requestStatus = item.statusCode;
        this.planModel.fundingPlanDto.planStatusName = item.currentStatusDescrip;
      }
    });
    this.isRequestEverSubmitted = submitted;
    this.readonly = (this.userReadonly) || !(this.statusesCanEditSubmit.includes(this.requestStatus));
    if (this.readonly) {
      this.navigationModel.disableStepLinks();
      this.navigationModel.showSteps = false;
    } else {
      this.navigationModel.enableStepLinks();
      this.navigationModel.showSteps = true;
    }
    this.logger.debug('After parsing status history ', this);
    this.changeDetection.detectChanges();
  }

  checkUserRolesCas(): void {
    const isPd = this.userSessionService.isPD();
    const isPa = this.userSessionService.isPA();
    const userCas = this.userSessionService.getUserCaCodes();
    const userNpnId = this.userSessionService.getLoggedOnUser().npnId;
    const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    if (!isPd && !isPa) {
      this.userCanDelete = false;
      this.userCanSubmit = false;
      this.userReadonly = true;
      return;
    } else if (isPd && userNpnId === this.planModel.fundingPlanDto.requestorNpnId) {
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else if (isPd && (userCas !== null) && (userCas.length > 0)
      && (userCas.indexOf(this.planModel.fundingPlanDto.cayCode) > -1)) {
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else if ((isPa || isPd) && userId === this.planModel.fundingPlanDto.planCreateUserId) {
      this.userCanSubmit = false;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else {
      this.userCanDelete = false;
      this.userCanSubmit = false;
      this.userReadonly = true;
      return;
    }
  }

  get isDisplayBudgetDocsUploadVar(): boolean {
       return this.workflowModel.isFinancialApprover &&
           ApprovingStatuses.includes(this.requestStatus);
  }

  get displayReadOnlyBudgetDocs(): boolean {
    return this.planModel.fundingPlanDto.budgetDocs?.length > 0;
  }

  prevStep(): void {
    this.router.navigate(['/plan/step5']);
  }

  submitWithdrawHold(action: string): void {
    this.workflowModal.openConfirmModal(action).then(
      (result) => {
        this.logger.debug(action + ' API call returned successfully', result);
        this.workflowModel.initializeForPlan(this.fprId);
        if (result.action === WorkflowActionCode.WITHDRAW) {
          this.planModel.fundingPlanDto.splMeetingDate = undefined;
        }
        this.requestIntegrationService.requestSubmissionEmitter.next(result);
      }
    )
      .catch(
        (reason) => {
          this.logger.debug('user dismissed workflow confirmation modal without proceed', reason);
        }
      );
  }

  withdrawVisible(): boolean {
    if (!this.statusesCanWithdraw.includes(this.requestStatus)) {
      return false;
    }
    return (this.userCanSubmit && !this.workflowModel.approvedByFC) ||
      (this.workflowModel.isDocApprover && this.workflowModel.approvedByDoc);
  }

  putOnHoldVisible(): boolean {
    if (!this.statusesCanOnHold.includes(this.requestStatus)) {
      return false;
    }
    return (this.userCanSubmit && !this.workflowModel.approvedByFC) ||
      (this.workflowModel.isDocApprover && this.workflowModel.approvedByDoc);
  }

  releaseFromHoldVisible(): boolean {
    return this.requestStatus === 'ON HOLD' &&
    ((this.userCanSubmit && !this.workflowModel.approvedByFC) ||
    (this.workflowModel.isDocApprover && this.workflowModel.approvedByDoc));
  }

  submitVisible(): boolean {
    return this.userCanSubmit && this.statusesCanEditSubmit.includes(this.requestStatus);
  }

  deleteVisible(): boolean {
    return this.userCanDelete && !this.isRequestEverSubmitted;
  }

  submitEnabled(): boolean {
    return !this.docChecker.docMissing;
  }

  submitDisableTooltip(): string {
    return this.docChecker.tooltipText;
  }

  deleteRequest(): void {
    if (confirm('Are you sure you want to delete this funding plan?')) {
      this.logger.debug('Call deletePlan API for FprId=' + this.fprId);
      this.fsPlanWorkflowControllerService.deletePlanUsingDELETE(this.fprId).subscribe(
        result => {
          this.logger.debug('Funding plan was deleted: ', result);
          this.planModel.reset();
          this.router.navigate(['/search']);
        },
        error => {
          this.logger.error('Error when calling deletePlan API ', error);
        }
      );
    }
  }

  get noSkipResult(): boolean {
    return !this.grantsSkipped || this.grantsSkipped.length === 0;
  }

  get noAppNotFundingResult(): boolean {
    return !this.grantsNotConsidered || this.grantsNotConsidered.length === 0;
  }

  submitRequest(): void {
    this.cancerActivityService.getActiveReferralCaAssignRulesUsingGET('Y').subscribe(
      result => {
        const activeCayCodes: string[] = result.map(ra => ra.caCode);
        if (activeCayCodes.includes(this.planModel.fundingPlanDto.cayCode) ) {
          this.submitRequestToBackend();
        }
        else {
          const error = {message: 'Requesting PD\'s Cancer Activity is inactive. You can update the Cancer Activity by navigating to the Step 3: Plan Info page'};
          this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
        }
      },
      error => {
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      }
    );
  }

  private submitRequestToBackend(): void {
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.fprId = this.fprId;
    dto.action = WorkflowActionCode.SUBMIT;
    dto.requestorNpeId = this.planModel.fundingPlanDto.requestorNpeId;
    dto.comments = this.workflowComponent.comments;
    if (this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0) {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map(a => {
        return a.approverLdap;
      });
    }
    this.logger.debug('Submit Funding Plan, workflowDto is ', dto);
    // const nextApproverInChain = this.workflowModel.getNextApproverInChain();
    this.fsPlanWorkflowControllerService.submitPlanWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('Submit Request result: ', result);
        this.workflowModel.initializeForPlan(this.fprId);
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
      },
      (error) => {
        this.logger.error('Failed when calling submitRequestUsingPOST', error);
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      });
  }

  // test(): void {
  //   const dto: WorkflowTaskDto = {};
  //   dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
  //   dto.fprId = this.fprId;
  //   dto.action = WorkflowActionCode.SUBMIT;
  //   dto.requestorNpeId = this.planModel.fundingPlanDto.requestorNpeId;
  //   this.requestIntegrationService.requestSubmissionEmitter.next(dto);
  // }

  hideWorkflow(): boolean {
    return this.requestStatus === RequestStatus.REJECTED;
  }

  isDirty(): boolean {
    return (this.workflowComponent?.isDirty());
  }

  clearAlerts(): void {
    this.planModel.clearAlerts();
  }

  showBudgetInformation(): boolean {
    return this.workflowModel.isFinancialApprover || this.workflowModel.approvedByFC;
  }

  goToWorkflow(): void {
    if (this.workflowModel.isFinancialApprover) {
      const el = document.getElementById('workflow-budget-info');
      el.scrollIntoView();
    }
    else if (this.workflowModel.isGMApprover) {
      const el = document.getElementById('workflow-grant-management');
      el.scrollIntoView();
    }
    else {
      const el = document.getElementById('workflow-section');
      el.scrollIntoView();
    }
  }

  showGoToWorkflowButton(): boolean {
    return (this.workflowComponent?.isApprover());
  }
}

export class FundingPlanDocChecker {
  docMissing: boolean;
  tooltipText: string;
  warningText: string;
  planChangedAfterUpload: boolean;

  private docTypes: any[] = [
    {docType: DocTypeConstants.JUSTIFICATION, tooltip: 'Scientific Rationale'},
    {docType: DocTypeConstants.EXCEPTION_JUSTIFICATION, tooltip: 'Exception Justification'},
    {docType: DocTypeConstants.SKIP_JUSTIFICATION, tooltip: 'Skipped Justification'}
  ];

  private missingTooltips: string[];
  private planModel: PlanModel;

  constructor(planModel: PlanModel) {
    this.missingTooltips = [];
    this.planModel = planModel;
    let justificationUploaded = false;
    this.docTypes.forEach( rd => {
      const docMissing = this.docNotFound(rd.docType);
      const docRequired = this.docTypeRequired(rd.docType);
      if (docRequired && !docMissing) {
        justificationUploaded = true;
      }
      if ( docRequired && docMissing) {
        this.missingTooltips.push(rd.tooltip);
      }
    });

    this.docMissing = this.missingTooltips.length > 0;
    if (this.docMissing) {
      for (let i = 0; i < this.missingTooltips.length; i++) {
        if (i === 0) {
          this.tooltipText = this.missingTooltips[i];
        }
        else if ( this.missingTooltips.length > 1 && i === (this.missingTooltips.length - 1)) {
          this.tooltipText += ' and ' + this.missingTooltips[i];
        }
        else {
          this.tooltipText += ', ' + this.missingTooltips[i];
        }
      }
      this.warningText = this.tooltipText + (this.missingTooltips.length > 1 ? ' have ' : ' has ');
      this.tooltipText = 'You must upload ' + this.tooltipText + ' to submit this Plan';
    }
    this.planChangedAfterUpload = justificationUploaded && this.planModel.documentSnapshotChanged();
  }

  private docNotFound(docType: string): boolean {
    const docs = this.planModel.fundingPlanDto.documents;
    if (!docs) {
      return true;
    }
    else {
      return docs.filter( doc => doc.docType === docType).length === 0;
    }
  }

  private docTypeRequired(docType: string): boolean {
    if (docType === DocTypeConstants.JUSTIFICATION) {
      return this.planModel.allGrants.filter( g => g.selected).length > 0;
    }
    else if (docType === DocTypeConstants.EXCEPTION_JUSTIFICATION) {
      return  this.planModel.allGrants.filter(g => g.selected &&
        (g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore)).length > 0;
    }
    else if (docType === DocTypeConstants.SKIP_JUSTIFICATION) {
      return this.planModel.allGrants.filter(g => !g.selected &&
        (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
        g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore
        ).length > 0;
    }
    else {
      return false;
    }
  }
}

/*
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RequestModel } from '../../model/request/request-model';
import { AppPropertiesService } from '../../service/app-properties.service';
import {
  FsRequestControllerService, FundingReqStatusHistoryDto,
  NciPfrGrantQueryDto, DocumentsDto,
  FundingReqApproversDto, FsWorkflowControllerService, WorkflowTaskDto
} from '@nci-cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { WorkflowModalComponent } from '../workflow-modal/workflow-modal.component';
import { ApprovingStatuses, RequestStatus, WorkflowActionCode, WorkflowModel } from '../workflow/workflow.model';
import { WorkflowComponent } from '../workflow/workflow.component';
import { UploadBudgetDocumentsComponent } from '../../upload-budget-documents/upload-budget-documents.component';
import { NavigationStepModel } from '../step-indicator/navigation-step.model';
import { BudgetInfoComponent } from '../../cans/budget-info/budget-info.component';

@Component({
  selector: 'app-step4',
  templateUrl: './step4.component.html',
  styleUrls: ['./step4.component.css'],
  providers: [WorkflowModel]
})
export class Step4Component implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('submitResult') submitResultElement: ElementRef;
  @ViewChild(WorkflowModalComponent) workflowModal: WorkflowModalComponent;
  @ViewChild(WorkflowComponent) workflowComponent: WorkflowComponent;
  @ViewChild(UploadBudgetDocumentsComponent) uploadBudgetDocumentsComponent: UploadBudgetDocumentsComponent;
  @ViewChild(BudgetInfoComponent) budgetInfoComponent: BudgetInfoComponent;

  statusesCanWithdraw = ['SUBMITTED', 'ON HOLD', 'APPROVED', 'AWC', 'DEFER',
    'RELEASED', 'DELEGATED', 'ROUTED', 'REASSIGNED'];
  statusesCanOnHold = ['SUBMITTED', 'APPROVED', 'AWC', 'DEFER',
    'RELEASED', 'DELEGATED', 'ROUTED', 'REASSIGNED'];
  statusesCanEditSubmit = ['DRAFT', 'WITHDRAWN', 'RFC'];
  terminalStatus = ['COMPLETED', 'REJECTED'];

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  isRequestEverSubmitted = false;
  requestHistorySubscriber: Subscription;
  activeApproverSubscriber: Subscription;
  // submissionResult: { status: 'success' | 'failure' | '', frqId?: number, approver?: FundingReqApproversDto, errorMessage?: string }
  //   = { status: '' };
  requestStatus: string;
  docDtos: DocumentsDto[];
  excludedDocDtos: DocumentsDto[];
  readonly = false;
  activeApprover: FundingReqApproversDto;

  userCanSubmit = false;
  userCanDelete = false;
  userReadonly = true;
  justificationMissing = false;
  justificationType = '';
  justificationText = '';
  transitionMemoMissing = false;
  // isDisplayBudgetDocsUploadVar = false;
  closeResult: string;
  _workFlowAction = '';

  userCanSubmitApprove = false;

  // get budgetDocDtos(): DocumentsDto[] {
  //   return this.requestModel.requestDto.budgetDocs;
  // }
  get displayReadOnlyBudgetDocs(): boolean {
    return this.requestModel.requestDto.budgetDocs?.length > 0;
  }

  actionType(workFlowAction: string): void {
    this._workFlowAction = workFlowAction;
  }

  get workFlowAction(): string {
    return this._workFlowAction;
  }

  constructor(private router: Router,
              private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private changeDetection: ChangeDetectorRef,
              private logger: NGXLogger,
              private fsWorkflowControllerService: FsWorkflowControllerService,
              private workflowModel: WorkflowModel,
              private navigationModel: NavigationStepModel) {
  }

  ngAfterViewInit(): void {
    this.submitResultElement.nativeElement.scrollIntoView();

    if (this.budgetInfoComponent && this.workflowComponent) {
      this.workflowComponent.budgetInfoComponent = this.budgetInfoComponent;
    }
  }

  ngOnDestroy(): void {
    if (this.requestHistorySubscriber) {
      this.requestHistorySubscriber.unsubscribe();
    }
    if (this.activeApproverSubscriber) {
      this.activeApproverSubscriber.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(4, true);
    this.requestHistorySubscriber = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );
    this.docDtos = this.requestModel.requestDto.includedDocs;
    this.excludedDocDtos = this.requestModel.requestDto.excludedDocs;
    this.workflowModel.initialize();
    this.checkUserRolesCas();
    this.checkDocs();
    // this.isDisplayBudgetDocsUpload();

    // this.budgetDocDtos = this.requestModel.requestDto.budgetDocs;
    // if (this.budgetDocDtos.length > 0) {
    //   this.displayReadOnlyBudgetDocs = true;
    // }
  }

  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    let submitted = false;
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      // const i = item.statusDescrip.search(/ by /gi);
      // if (i > 0) {
      //   item.statusDescrip = item.statusDescrip.substring(0, i);
      // }

      if (item.statusCode === 'SUBMITTED') {
        submitted = true;
      }

      if (!item.endDate) {
        this.requestStatus = item.statusCode;
        this.requestModel.requestDto.requestStatusName = item.currentStatusDescrip;
      }

    });
    this.isRequestEverSubmitted = submitted;
    this.readonly = (this.userReadonly) || !(this.statusesCanEditSubmit.includes(this.requestStatus));
    if (this.readonly) {
      this.navigationModel.disableStepLinks();
      this.navigationModel.showSteps = false;
    } else {
      this.navigationModel.enableStepLinks();
      this.navigationModel.showSteps = true;
    }
    this.changeDetection.detectChanges();
  }

  checkUserRolesCas(): void {
    const isPd = this.userSessionService.isPD();
    const isPa = this.userSessionService.isPA();
    const userCas = this.userSessionService.getUserCaCodes();
    const userNpnId = this.userSessionService.getLoggedOnUser().npnId;
    const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    this.userCanSubmitApprove = false;
    if (!isPd && !isPa) {
      this.userCanDelete = false;
      this.userCanSubmit = false;
      this.userReadonly = true;
      return;
    } else if (isPd && userNpnId === this.requestModel.requestDto.financialInfoDto.requestorNpnId) {
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      this.userCanSubmitApprove = this.requestModel.requestDto.loaCode === 'PD' &&
        !this.requestModel.requestDto.financialInfoDto.otherDocText;
      return;
    } else if (isPd && (userCas !== null) && (userCas.length > 0)
      && (userCas.indexOf(this.requestModel.requestDto.financialInfoDto.requestorCayCode) > -1)) {
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else if ((isPa || isPd) && userId === this.requestModel.requestDto.requestCreateUserId) {
      this.userCanSubmit = false;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else {
      this.userCanDelete = false;
      this.userCanSubmit = false;
      this.userReadonly = true;
      return;
    }
  }

  checkDocs(): void {
    this.justificationMissing = true;
    this.transitionMemoMissing = false;
    if (this.requestModel.requestDto.justification
      && this.requestModel.requestDto.justification.length > 0) {
      this.justificationMissing = false;
      this.justificationType = 'text';
      this.justificationText = this.requestModel.requestDto.justification;
    } else if (this.docDtos && this.docDtos.length > 0) {
      for (const doc of this.docDtos) {
        if (doc.docType === 'Justification') {
          this.justificationMissing = false;
          break;
        }
      }
    }

    if (this.requestModel.requestDto.requestType.indexOf('Pay Type 4') > -1) {
      this.transitionMemoMissing = true;
      if (this.docDtos && this.docDtos.length > 0) {
        for (const doc of this.docDtos) {
          if (doc.docType === 'Transition Memo') {
            this.transitionMemoMissing = false;
            break;
          }
        }
      }
    }
  }

  prevStep(): void {
    this.router.navigate(['/request/step3']);
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  deleteRequest(): void {
    if (confirm('Are you sure you want to delete this request?')) {
      this.logger.debug('Call deleteRequest API for FRQ ID: ', this.model.requestDto.frqId);
      this.fsRequestService.deleteRequestUsingDELETE(this.model.requestDto.frqId).subscribe(
        result => {
          this.logger.debug('Funding request was deleted: ', result);
          this.requestModel.reset();
          this.router.navigate(['/search']);
        },
        error => {
          this.logger.error('Error when calling delelteRequest API ', error);
        }
      );
    }
  }

  submitRequest(): void {
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.frqId = this.requestModel.requestDto.frqId;
    if (this.submitApprove()) {
      dto.action = WorkflowActionCode.SUBMIT_APPROVE;
    } else {
      dto.action = WorkflowActionCode.SUBMIT;
    }
    dto.requestorNpeId = this.requestModel.requestDto.requestorNpeId;
    dto.certCode = this.requestModel.requestDto.certCode;
    dto.comments = this.workflowComponent.comments;
    if (this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0) {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map(a => {
        return a.approverLdap;
      });
    }
    this.logger.debug('Submit Request for: ', dto);
    // const nextApproverInChain = this.workflowModel.getNextApproverInChain();
    this.fsWorkflowControllerService.submitWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('Submit Request result: ', result);
        // this.submissionResult = { status: 'success', frqId: dto.frqId, approver: nextApproverInChain };
        this.workflowModel.initialize();
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
        //       this.submitResultElement.nativeElement.scrollIntoView();
        this.readonly = true;
        //       this.requestModel.disableStepLinks();
      },
      (error) => {
        this.logger.error('Failed when calling submitRequestUsingPOST', error);
        // this.submissionResult = { status: 'failure' };
        if (error.error) {
          // this.submissionResult.errorMessage = error.error.errorMessage;
          this.requestIntegrationService.requestSubmitFailureEmitter.next(error.error.errorMessage);
        }
        this.submitResultElement.nativeElement.scrollIntoView();
      });
  }

  submitWithdrawHold(action: string): void {
    this.workflowModal.openConfirmModal(action).then(
      (result) => {
        this.logger.debug(action + ' API call returned successfully', result);
        this.workflowModel.initialize();
        this.requestIntegrationService.requestSubmissionEmitter.next(result);
//         if (action === 'WITHDRAW') {
//           this.requestModel.enableStepLinks();
//         }
      }
    )
      .catch(
        (reason) => {
          this.logger.debug('user dismissed workflow confirmation modal without proceed', reason);
        }
      );
  }

  withdrawVisible(): boolean {
    if (!this.statusesCanWithdraw.includes(this.requestStatus)) {
      return false;
    }
    return (this.userCanSubmit && !this.workflowModel.approvedByFC) ||
      (this.workflowModel.isDocApprover && this.workflowModel.approvedByDoc);
  }

  putOnHoldVisible(): boolean {
    if (!this.statusesCanOnHold.includes(this.requestStatus)) {
      return false;
    }
    return (this.userCanSubmit && !this.workflowModel.approvedByFC) ||
      (this.workflowModel.isDocApprover && this.workflowModel.approvedByDoc);
  }

  releaseFromHoldVisible(): boolean {
    return this.requestStatus === 'ON HOLD' &&
    ((this.userCanSubmit && !this.workflowModel.approvedByFC) ||
    (this.workflowModel.isDocApprover && this.workflowModel.approvedByDoc));
  }

  submitVisible(): boolean {
    return this.userCanSubmit && this.statusesCanEditSubmit.includes(this.requestStatus);
  }

  deleteVisible(): boolean {
    return this.userCanDelete && !this.isRequestEverSubmitted;
  }

  submitEnabled(): boolean {
    return !this.justificationMissing && !this.transitionMemoMissing;
  }

  submitApprove(): boolean {
    return this.userCanSubmitApprove &&
      //     this.requestStatus === 'DRAFT' &&
      !this.workflowModel.hasNewApprover;
  }

  submitDisableTooltip(): string {
    if (this.justificationMissing && this.transitionMemoMissing) {
      return 'You must upload Justification and Transition Memo to submit this request.';
    } else if (this.justificationMissing) {
      return 'You must upload Justification to submit this request.';
    } else if (this.transitionMemoMissing) {
      return 'You must upload Transition Memo to submit this request.';
    } else {
      return '';
    }
  }

  get isDisplayBudgetDocsUploadVar(): boolean {
    return this.workflowModel.isFinancialApprover &&
           ApprovingStatuses.includes(this.requestStatus);
  }

  // isDisplayBudgetDocsUpload(): void {
  //   this.fsWorkflowControllerService.getRequestApproversUsingGET(this.requestModel.requestDto.frqId).subscribe(
  //     result => {
  //       if (result) {
  //         if (!this.isTerminalStatus() && this.requestModel.requestDto.requestStatusCode !== 'ON HOLD') {
  //           for (const approver in result) {
  //             if (this.isCurrentApprover(result[approver]) || this.workflowModel.approvedByFC) {
  //               if (result[approver].roleCode === 'FCARC' ||
  //                 result[approver].roleCode === 'FCNCI') {
  //                 this.isDisplayBudgetDocsUploadVar = true;
  //                 break;
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }, error => {
  //       this.logger.error('HttpClient get request error for----- ' + error.message);
  //     });
  // }

  // isTerminalStatus(): boolean {
  //   return (this.terminalStatus.indexOf(this.requestModel.requestDto.requestStatusCode) > -1);
  // }

  // isCurrentApprover(approver: FundingReqApproversDto): boolean {
  //   const loggedOnUser: NciPerson = this.userSessionService.getLoggedOnUser();
  //   const userId = loggedOnUser.nihNetworkId;
  //   if (approver.activeFlag === 'Y') {
  //     if (approver.approverLdap.toLowerCase() === userId.toLowerCase() ||
  //       this.isCurrentUserDesignee(approver.designees) ||
  //       this.isUserPfrGmCommonApprover(approver, loggedOnUser)) {
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  // isCurrentUserDesignee(designees: Array<FundingRequestPermDelDto>): boolean {
  //   if (designees) {
  //     const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
  //     for (const designee in designees) {
  //       if (designees[designee].delegateTo.toLowerCase() === userId.toLowerCase()) {
  //         return true;
  //       }
  //     }
  //   }
  //   return false;
  // }

  // isUserOEFIAFinacialAnalyst(approver: FundingReqApproversDto, loggedOnUser: NciPerson): boolean {
  //   if (approver.roleCode === 'FCNCI' && this.hasOEFIARole(loggedOnUser)) {
  //     return true;
  //   }
  //   return false;
  // }

  // hasOEFIARole(loggedOnUser: NciPerson): boolean {
  //   const rolesList: I2ERoles[] = loggedOnUser.roles;
  //   for (const role in rolesList) {
  //     if (rolesList[role].roleCode === 'FA' && rolesList[role].orgAbbrev === 'OEFIA') {
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  // isUserPfrGmCommonApprover(approver: FundingReqApproversDto, loggedOnUser: NciPerson): boolean {
  //   if (approver.roleCode === 'GM' && this.hasPFRGMAPRRole(loggedOnUser)) {
  //     return true;
  //   }
  //   return false;
  // }

  // hasPFRGMAPRRole(loggedOnUser: NciPerson): boolean {
  //   const rolesList: I2ERoles[] = loggedOnUser.roles;
  //   for (const role in rolesList) {
  //     if (rolesList[role].roleCode === 'PFRGMAPR') {
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  get self(): Step4Component {
    return this;
  }


  budgetInfoReadOnly(): boolean {
    // if the user is a financial approver and can take a workflow action, budget info is editable.
    // otherwise, it is not editable.
    if (this.workflowModel.isFinancialApprover && this.workflowModel.getWorkflowList()?.length !== 0) {
      return false;
    }
    return true;
  }

  showBudgetInfo(): boolean {
    return this.workflowModel.isFinancialApprover || this.workflowModel.approvedByFC;
  }

  hideWorkflow(): boolean {
    return this.requestStatus === RequestStatus.REJECTED;
  }
}
*/
