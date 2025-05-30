import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RequestModel } from '../../model/request/request-model';
import {AppPropertiesService, LoaderService} from '@cbiit/i2ecui-lib';
import {
  FsRequestControllerService,
  FsWorkflowControllerService,
  FundingPlanDto,
  FundingReqApproversDto,
  FundingReqStatusHistoryDto,
  NciPfrGrantQueryDto,
  WorkflowTaskDto
} from '@cbiit/i2efsws-lib';
import { CancerActivityControllerService} from '@cbiit/i2erefws-lib'
import { DocumentsDto} from '@cbiit/i2ecommonws-lib'
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
import { INITIAL_PAY_TYPES } from 'src/app/model/request/funding-request-types';
import { FundingRequestTypes } from '../../model/request/funding-request-types';

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

  grantViewerUrl: string ;
  isRequestEverSubmitted = false;
  requestHistorySubscriber: Subscription;
  activeApproverSubscriber: Subscription;
  requestStatus: string;
  currentStatusId: number;
  docDtos: DocumentsDto[];
   readonly = false;
  activeApprover: FundingReqApproversDto;

  userCanSubmit = false;
  userCanDelete = false;
  userReadonly = true;
  justificationMissing = false;
  justificationType = '';
  justificationText = '';
  transitionMemoMissing = false;
  _workFlowAction = '';

  userCanSubmitApprove = false;
  inflightPlan: FundingPlanDto;
  disableSubmit = false;

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
              private cancerActivityService: CancerActivityControllerService,
              private workflowModel: WorkflowModel,
              private navigationModel: NavigationStepModel,
              private loaderService: LoaderService) {
    this.grantViewerUrl  = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  }

  ngAfterViewInit(): void {
  //  this.submitResultElement.nativeElement.scrollIntoView();

    if (this.budgetInfoComponent && this.workflowComponent) {
      this.workflowComponent.budgetInfoComponent = this.budgetInfoComponent;
    }

    if (this.uploadBudgetDocumentsComponent && this.workflowComponent) {
      this.workflowComponent.uploadBudgetDocumentsComponent = this.uploadBudgetDocumentsComponent;
    }

    if (this.requestModel.pendingAlerts.length > 0 || this.inflightPlan) {
      const el = document.getElementById('funding-request-page-top');
      el.scrollIntoView();
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
    this.workflowModel.initialize();
    this.checkUserRolesCas();
    this.checkDocs();
    this.isDocsStepCompleted();
    this.checkInflightFundingPlan();
  }

  private isDocsStepCompleted(): void {
    if (!this.justificationMissing && !this.transitionMemoMissing) {
      this.navigationModel.setStepComplete(3, true);
    } else {
      this.navigationModel.setStepComplete(3, false);
    }
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
        this.requestModel.requestDto.requestStatusName = item.currentStatusDescrip;
      }

    });
    this.isRequestEverSubmitted = submitted;
    this.readonly = (this.userReadonly) || !(this.statusesCanEditSubmit.includes(this.requestStatus));
    if (this.readonly) {
      this.navigationModel.disableStepLinks();
      this.navigationModel.showSteps = false;
    } else {
      this.logger.info('Enable step links');
      this.navigationModel.enableStepLinks();
      this.navigationModel.showSteps = true;
    }
    this.changeDetection.detectChanges();
  }

  checkInflightFundingPlan(): void {
    if (INITIAL_PAY_TYPES.includes(this.requestModel.requestDto.financialInfoDto.requestTypeId)) {
      this.fsRequestService.checkIsFundedByFundingPlan(this.requestModel.grant.applId).subscribe(result => {
          this.inflightPlan = result;
          this.logger.debug('checkIsFundedByPlan ', result);
      });
    }
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

    if (+this.requestModel.requestDto.frtId === +FundingRequestTypes.PAY_TYPE_4 &&
      ((this.requestModel.requestDto.conversionActivityCode && this.requestModel.requestDto.conversionActivityCode !== 'NC') || this.requestModel.is4R00()))  {
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
      this.logger.info('Call deleteRequest API for FRQ ID: ', this.model.requestDto.frqId);
      this.fsRequestService.deleteRequest(this.model.requestDto.frqId).subscribe(
        result => {
          this.logger.info(`Funding request was deleted: ${JSON.stringify(result)}`);
          this.requestModel.reset();
          this.router.navigate(['/search']);
        },
        error => {
          this.logger.error(`Error when calling deleteRequest API ${JSON.stringify(error)}`);
        }
      );
    }
  }

  submitRequest(): void {
    this.logger.info(`Submit request clicked for request ${this.requestModel.requestDto.frqId}`)
    this.disableSubmit = true;
    this.loaderService.show();
    this.cancerActivityService.getActiveReferralCaAssignRules('Y').subscribe(
      result => {
        const activeCayCodes: string[] = result.map(ra => ra.caCode);
        if (activeCayCodes.includes(this.requestModel.requestDto.requestorCayCode) ) {
          this.submitRequestToBackend();
        }
        else {
          const error = {message: 'Requesting PD\'s Cancer Activity is inactive. You can update the Cancer Activity by navigating to the Step 2: Request Info page'};
          this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
        }
      },
      error => {
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      }
    );
  }

  submitRequestToBackend(): void {
    const dto: WorkflowTaskDto = {};
    this.loaderService.show();
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
    dto.currentStatusId = this.currentStatusId;
    this.logger.debug('Submit Request for: ', dto);
    this.fsWorkflowControllerService.submitWorkflow(dto).subscribe(
      (result) => {
        this.logger.debug('Submit Request result: ', result);
        this.workflowModel.initialize();
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
        this.readonly = true;
        this.loaderService.hide();
      },
      (error) => {
        this.loaderService.hide();
        this.logger.error('Failed when calling submitRequest', error);
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      });
  }

  submitWithdrawHold(action: string): void {
    this.workflowModal.openConfirmModal(action, this.currentStatusId).then(
      (result) => {
        this.logger.debug(action + ' API call returned successfully', result);
        this.workflowModel.initialize();
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
    return !this.justificationMissing && !this.transitionMemoMissing;
  }

  submitApprove(): boolean {
    return this.userCanSubmitApprove &&
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
    return !this.requestModel.isSkip() && this.workflowModel.isFinancialApprover &&
           ApprovingStatuses.includes(this.requestStatus);
  }

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
    return !this.requestModel.isSkip() && (this.workflowModel.isFinancialApprover || this.workflowModel.approvedByFC);
  }

  hideWorkflow(): boolean {
    return this.requestStatus === RequestStatus.REJECTED || this.requestStatus === RequestStatus.CANCELLED;
  }

  goToWorkflow(): void {
    if (this.workflowModel.isFinancialApprover) {
      const el = document.getElementById('workflow-budget-info');
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    else if (this.workflowModel.isGMApprover) {
      const el = document.getElementById('workflow-grant-management');
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    else if (this.workflowModel.isScientificApprover) {
      const el = document.getElementById('workflow-approved-cost');
      if (el) {
        el.scrollIntoView();
        return;
      }
    }

    const el2 = document.getElementById('workflow-section');
    el2.scrollIntoView();

  }

  showGoToWorkflowButton(): boolean {
    return (this.workflowComponent?.isApprover());
  }
}
