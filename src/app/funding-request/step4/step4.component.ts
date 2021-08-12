import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RequestModel } from '../../model/request/request-model';
import { AppPropertiesService } from '../../service/app-properties.service';
import {
  FsRequestControllerService, FundingReqStatusHistoryDto,
  NciPfrGrantQueryDto, DocumentsDto,
  FundingReqApproversDto, FsWorkflowControllerService, FundingRequestPermDelDto,
  NciPerson, I2ERoles, WorkflowTaskDto
} from '@nci-cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { Subscription } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { WorkflowModalComponent } from '../workflow-modal/workflow-modal.component';
import { ApprovingStatuses, WorkflowActionCode, WorkflowModel } from '../workflow/workflow.model';
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
    return (this.requestStatus === 'ON HOLD' &&
      (this.userCanSubmit || this.workflowModel.isDocApprover));
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
}
