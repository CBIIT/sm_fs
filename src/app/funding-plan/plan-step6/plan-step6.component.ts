import { AfterViewInit, ChangeDetectorRef, Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import {
  CancerActivityControllerService,
  DocumentsDto,
  FsPlanControllerService,
  FsPlanWorkflowControllerService,
  FundingReqApproversDto,
  FundingReqStatusHistoryDto,
  FundingRequestQueryDto,
  WorkflowTaskDto
} from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { FundingRequestIntegrationService } from 'src/app/funding-request/integration/integration.service';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { WorkflowModalComponent } from 'src/app/funding-request/workflow-modal/workflow-modal.component';
import {
  ApprovingStatuses,
  RequestStatus,
  WorkflowActionCode,
  WorkflowModel
} from 'src/app/funding-request/workflow/workflow.model';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { PlanWorkflowComponent } from '../fp-workflow/plan-workflow.component';
import { DocTypeConstants } from './plan-supporting-docs-readonly/plan-supporting-docs-readonly.component';
import { UploadBudgetDocumentsComponent } from 'src/app/upload-budget-documents/upload-budget-documents.component';
import { CanManagementService } from '../../cans/can-management.service';
import { FpBudgetInformationComponent } from '../fp-budget-information/fp-budget-information.component';
import { FundingPlanInformationComponent } from '../funding-plan-information/funding-plan-information.component';

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
  @ViewChildren(FpBudgetInformationComponent) budgetInfoComponents: QueryList<FpBudgetInformationComponent>;
  @ViewChild(FundingPlanInformationComponent) fpInfoComponent: FundingPlanInformationComponent;

  grantsSkipped: NciPfrGrantQueryDtoEx[] = [];
  grantsNotConsidered: NciPfrGrantQueryDtoEx[] = [];

  inFlightProposed: FundingRequestQueryDto[];
  inFlightSkipped: FundingRequestQueryDto[];

  selectedApplIds: number[];
  skippedApplIds: number[];

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
  requestStatus: string;
  currentStatusId: number;
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

    if (this.fpInfoComponent) {
      this.fpInfoComponent.totalApplicationsReceived = this.planModel.allGrants.length;
      this.fpInfoComponent.totalApplicationsSelected = this.selectedApplIds?.length;
      this.fpInfoComponent.totalApplicationsSkipped = this.grantsSkipped?.length;
      this.fpInfoComponent.totalApplicationsNotConsidered = this.grantsNotConsidered.length;
      this.fpInfoComponent.countsSetByStep6 = true;
      this.logger.debug('Set fpInfoComp counts, selected = ' + this.fpInfoComponent.totalApplicationsSkipped);
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

    this.fsPlanControllerService.retrieveFundingPlanGrantsInfo(this.fprId).subscribe(
      result => {
        this.logger.debug('retrieveFundingPlanGrantsInfo returned ', result);
        this.selectedApplIds = result.filter( g => (g.frtId === 1024 || g.frtId === 1026)).map(g => g.applId);
        this.skippedApplIds = result.filter( g => (g.frtId === 1025)).map(g => g.applId);
        this.grantsSkipped = this.planModel.allGrants.filter( g =>
          ( this.skippedApplIds.includes(g.applId)) );
        this.grantsNotConsidered = this.planModel.allGrants.filter(g =>
          ( !this.selectedApplIds.includes(g.applId) && !this.skippedApplIds.includes(g.applId)) );
        this.logger.debug('skippedApplIds = ', this.skippedApplIds, 'selectedApplIds = ', this.selectedApplIds);
        this.checkInFlightPfr();
        this.docChecker = new FundingPlanDocChecker(this.planModel, this);
        this.isDocsStepCompleted();
        if (this.fpInfoComponent) {
          this.fpInfoComponent.totalApplicationsReceived = this.planModel.allGrants.length;
          this.fpInfoComponent.totalApplicationsSelected = this.selectedApplIds?.length;
          this.fpInfoComponent.totalApplicationsSkipped = this.grantsSkipped?.length;
          this.fpInfoComponent.totalApplicationsNotConsidered = this.grantsNotConsidered.length;
          this.fpInfoComponent.countsSetByStep6 = true;
          this.logger.debug('set fpInfoComp counts, selected=' + this.fpInfoComponent.totalApplicationsSelected);
        }
      },
      error => {
        this.logger.error('calling retrieveFundingPlanGrantsInfo failed ', error);
      }
    );

    this.workflowModel.initializeForPlan(this.fprId);
    this.checkUserRolesCas();
    this.canManagementService.initializeCANDisplayMatrixForPlan();
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
    this.fsPlanControllerService.getInFlightPFRs(this.fprId).subscribe(
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
        this.currentStatusId = item.statusId;
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
    this.workflowModal.openConfirmModal(action, this.currentStatusId).then(
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
      this.fsPlanWorkflowControllerService.deletePlan(this.fprId).subscribe(
        result => {
          this.logger.debug('Funding plan was deleted: ', result);
          // TODO: Plan management service also needs to be reset
          this.planModel.reset();
          this.router.navigate(['/search']);
        },
        error => {
          this.logger.error('Error when calling deletePlan API ', error);
          this.planModel.pendingAlerts = [{
            type: 'danger',
            message: error.error?.errorMessage || 'Something unexpected went wrong. Technical support has been notified.'
          }];
          window.scrollTo(0, 0);
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
    this.cancerActivityService.getActiveReferralCaAssignRules('Y').subscribe(
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
    dto.currentStatusId = this.currentStatusId;
    dto.updateStamp = this.planModel.fundingPlanDto.updateStamp;
    dto.lastChangeDate = this.planModel.fundingPlanDto.lastChangeDate;
    dto.action = WorkflowActionCode.SUBMIT;
    dto.requestorNpeId = this.planModel.fundingPlanDto.requestorNpeId;
    dto.comments = this.workflowComponent.comments;
    if (this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0) {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map(a => {
        return a.approverLdap;
      });
    }
    this.logger.debug('Submit Funding Plan, workflowDto is ', dto);
    this.fsPlanWorkflowControllerService.submitPlanWorkflow(dto).subscribe(
      (result) => {
        this.logger.debug('Submit Request result: ', result);
        this.workflowModel.initializeForPlan(this.fprId);
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
      },
      (error) => {
        this.logger.error('Failed when calling submitRequest', error);
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      });
  }

  hideWorkflow(): boolean {
    return this.requestStatus === RequestStatus.REJECTED || this.requestStatus === RequestStatus.CANCELLED;
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
  private step6: PlanStep6Component;

  constructor(planModel: PlanModel, step6: PlanStep6Component) {
    this.missingTooltips = [];
    this.planModel = planModel;
    this.step6 = step6;
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
      return this.planModel.allGrants.filter(g => this.step6.skippedApplIds.includes(g.applId)).length > 0;
    }
    else {
      return false;
    }
  }
}
