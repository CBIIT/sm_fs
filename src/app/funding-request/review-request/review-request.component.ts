import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RequestModel } from '../../model/request/request-model';
import { AppPropertiesService } from '../../service/app-properties.service';
import {
  FsRequestControllerService, FundingReqStatusHistoryDto,
  NciPfrGrantQueryDto, FundingRequestDtoReq, DocumentsDto,
  FundingReqApproversDto, FsWorkflowControllerService, FundingRequestPermDelDto,
  NciPerson, I2ERoles, WorkflowTaskDto
} from '@nci-cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { Subscription } from 'rxjs';
import { DocumentService } from '../../service/document.service';
import { saveAs } from 'file-saver';
import { HttpResponse } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { WorkflowModalComponent } from '../workflow-modal/workflow-modal.component';
import { WorkflowActionCode, WorkflowModel } from '../workflow/workflow.model';
import { WorkflowComponent } from '../workflow/workflow.component';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { BudgetInfoComponent } from '../../cans/budget-info/budget-info.component';
import { UploadBudgetDocumentsComponent } from '../../upload-budget-documents/upload-budget-documents.component';

@Component({
  selector: 'app-review-request',
  templateUrl: './review-request.component.html',
  styleUrls: ['./review-request.component.css'],
  providers: [WorkflowModel]
})
export class ReviewRequestComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('submitResult') submitResultElement: ElementRef;
  @ViewChild(WorkflowModalComponent) workflowModal: WorkflowModalComponent;
  @ViewChild(WorkflowComponent) workflowComponent: WorkflowComponent;
  @ViewChild(UploadBudgetDocumentsComponent) uploadBudgetDocumentsComponent: UploadBudgetDocumentsComponent;

  statusesCanWithdraw = ['SUBMITTED', 'ON HOLD', 'RFC'];
  statusesCanOnHold = ['SUBMITTED'];
  statusesCanSubmit = ['DRAFT', 'WITHDRAW', 'RFC'];
  terminalStatus = ['COMPLETED', 'REJECTED'];

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  isRequestEverSubmitted = false;
  requestHistorySubscriber: Subscription;
  activeApproverSubscriber: Subscription;
  submissionResult: { status: 'success' | 'failure' | '', frqId?: number, approver?: FundingReqApproversDto, errorMessage?: string }
    = { status: '' };
  requestStatus: string;
  docDtos: DocumentsDto[];
  readonly = false;
  readonlyStatuses = ['SUBMITTED', 'APPROVED', 'COMPLETED', 'REJECTED'];
  activeApprover: FundingReqApproversDto;

  userCanSubmit = false;
  userCanDelete = false;
  userReadonly = true;
  justificationMissing = false;
  justificationType = '';
  justificationText = '';
  transitionMemoMissing = false;
  isDisplayBudgetDocsUploadVar = false;
  closeResult: string;

  userCanSubmitApprove = false;

  constructor(private router: Router,
              private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private documentService: DocumentService,
              private changeDetection: ChangeDetectorRef,
              private logger: NGXLogger,
              private fsWorkflowControllerService: FsWorkflowControllerService,
              private modalService: NgbModal,
              private workflowModel: WorkflowModel) {
  }

  ngAfterViewInit(): void {
    this.submitResultElement.nativeElement.scrollIntoView();

    if (this.uploadBudgetDocumentsComponent?.budgetInfoComponent && this.workflowComponent) {
      this.logger.debug('setting budget info component:', this.uploadBudgetDocumentsComponent.budgetInfoComponent);
      this.workflowComponent.budgetInfoComponent = this.uploadBudgetDocumentsComponent.budgetInfoComponent;
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
    // this.logger.debug('Step4 requestModel: ', this.requestModel);
    this.requestModel.setStepLinkable(4, true);
    this.requestHistorySubscriber = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );
    this.docDtos = this.requestModel.requestDto.includedDocs;
    this.workflowModel.initialize();
    this.checkUserRolesCas();
    this.checkDocs();
    this.isDisplayBudgetDocsUpload();
  }

  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    let submitted = false;
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      const i = item.statusDescrip.search(/ by /gi);
      if (i > 0) {
        item.statusDescrip = item.statusDescrip.substring(0, i);
      }

      if (item.statusCode === 'SUBMITTED') {
        submitted = true;
      }

      if (!item.endDate) {
        this.requestStatus = item.statusCode;
        this.requestModel.requestDto.requestStatusName = item.statusDescrip + ' by ' + item.performedBy;
      }

    });
    this.isRequestEverSubmitted = submitted;
    this.readonly = (this.userReadonly) || (this.readonlyStatuses.indexOf(this.requestStatus) > -1);
    if (this.readonly) {
      this.requestModel.disableStepLinks();
    } else {
      this.requestModel.enableStepLinks();
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
      // this.logger.debug('Neither PD or PA, submit & delete = false');
      this.userCanDelete = false;
      this.userCanSubmit = false;
      this.userReadonly = true;
      return;
    } else if (isPd && userNpnId === this.requestModel.requestDto.financialInfoDto.requestorNpnId) {
      // this.logger.debug('PD & is this requestor, submit & delete = true');
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      this.userCanSubmitApprove = true;
      return;
    } else if (isPd && (userCas !== null) && (userCas.length > 0)
      && (userCas.indexOf(this.requestModel.requestDto.financialInfoDto.requestorCayCode) > -1)) {
      // this.logger.debug('PD & CA matches request\'s CA, submit & delete = true');
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else if ((isPa || isPd) && userId === this.requestModel.requestDto.requestCreateUserId) {
      // this.logger.debug('PA or PD & is request creator, submit = false, delete = true');
      this.userCanSubmit = false;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else {
      this.logger.debug('PD or PA but not the right ones, submit & delete = false');
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
    const nextApproverInChain = this.workflowModel.getNextApproverInChain();
    this.fsWorkflowControllerService.submitWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('Submit Request result: ', result);
        this.submissionResult = { status: 'success', frqId: dto.frqId, approver: nextApproverInChain };
        this.requestIntegrationService.requestSubmissionEmitter.next(dto.frqId);
        this.workflowModel.initialize();
        this.submitResultElement.nativeElement.scrollIntoView();
        this.readonly = true;
        this.requestModel.disableStepLinks();
      },
      (error) => {
        this.logger.error('Failed when calling submitRequestUsingPOST', error);
        this.submissionResult = { status: 'failure' };
        if (error.error) {
          this.submissionResult.errorMessage = error.error.errorMessage;
        }
        this.submitResultElement.nativeElement.scrollIntoView();
      });
  }

  submitWithdrawHold(action: string): void {
    this.workflowModal.openConfirmModal(action).then(
      (result) => {
        this.logger.debug(action + ' API call returned successfully', result);
        this.requestIntegrationService.requestSubmissionEmitter.next(this.requestModel.requestDto.frqId);
        if (action === 'WITHDRAW') {
          this.requestModel.enableStepLinks();
        }
      }
    )
      .catch(
        (reason) => {
          this.logger.debug('user dismissed workflow confirmation modal without proceed', reason);
        }
      );
  }

  withdrawVisible(): boolean {
    return (this.statusesCanWithdraw.indexOf(this.requestStatus) > -1) && this.userCanSubmit;
  }

  putOnHoldVisible(): boolean {
    return (this.statusesCanOnHold.indexOf(this.requestStatus) > -1) && this.userCanSubmit;
  }

  submitVisible(): boolean {
    return this.userCanSubmit && this.statusesCanSubmit.indexOf(this.requestStatus) > -1;
  }

  deleteVisible(): boolean {
    return this.userCanDelete && !this.isRequestEverSubmitted;
  }

  submitEnabled(): boolean {
    return !this.justificationMissing && !this.transitionMemoMissing;
  }

  submitApprove(): boolean {
    return this.requestModel.requestDto.loaCode === 'PD' &&
      this.userCanSubmitApprove &&
      this.requestStatus === 'DRAFT' &&
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

  downloadCoverSheet(): void {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Cover Page.pdf');
        }
      );
  }

  downloadFile(id: number, fileName: string): void {

    if (fileName === 'Summary Statement') {
      this.downloadSummaryStatement();
    } else {
      this.documentService.downloadById(id)
        .subscribe(
          (response: HttpResponse<Blob>) => {
            const blob = new Blob([response.body], { type: response.headers.get('content-type') });
            saveAs(blob, fileName);
          }
        );
    }

  }

  open(content) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  downloadSummaryStatement(): void {
    this.documentService.downloadFrqSummaryStatement(this.requestModel.grant.applId)
      .subscribe(
        blob => saveAs(blob, 'Summary Statement.pdf'),
        _error => this.logger.error('Error downloading the file'),
        () => this.logger.debug('File downloaded successfully')
      );
  }

  isDisplayBudgetDocsUpload(): void {
    this.fsWorkflowControllerService.getRequestApproversUsingGET(this.requestModel.requestDto.frqId).subscribe(
      result => {
        if (result) {
          if (!this.isTerminalStatus() && this.requestStatus !== 'ON HOLD') {
            for (const role in result) {
              if (this.isCurrentApprover(result[role])) {
                if (result[role].roleCode === 'FCARC' ||
                  result[role].roleCode === 'FCNCI') {
                  this.logger.debug('user is funds approver');
                  this.isDisplayBudgetDocsUploadVar = true;
                  break;
                }
              }
            }
          }
        }
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  isTerminalStatus(): boolean {
    return (this.terminalStatus.indexOf(this.requestStatus) > -1);
  }

  isCurrentApprover(approver: FundingReqApproversDto): boolean {
    const loggedOnUser: NciPerson = this.userSessionService.getLoggedOnUser();
    const userId = loggedOnUser.nihNetworkId;
    if (approver.activeFlag === 'Y') {
      if (approver.approverLdap.toLowerCase() === userId.toLowerCase() ||
        this.isCurrentUserDesignee(approver.designees) ||
        this.isUserPfrGmCommonApprover(approver, loggedOnUser)) {
        return true;
      }
    }
    return false;
  }

  isCurrentUserDesignee(designees: Array<FundingRequestPermDelDto>): boolean {
    if (designees) {
      const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
      for (const designee in designees) {
        if (designees[designee].delegateTo.toLowerCase === userId.toLowerCase) {
          return true;
        }
      }
    }
    return false;
  }

  isUserOEFIAFinacialAnalyst(approver: FundingReqApproversDto, loggedOnUser: NciPerson): boolean {
    if (approver.roleCode === 'FCNCI' && this.hasOEFIARole(loggedOnUser)) {
      return true;
    }
    return false;
  }

  hasOEFIARole(loggedOnUser: NciPerson): boolean {
    const rolesList: I2ERoles[] = loggedOnUser.roles;
    for (const role in rolesList) {
      if (rolesList[role].roleCode === 'FA' && rolesList[role].orgAbbrev === 'OEFIA') {
        return true;
      }
    }
    return false;
  }

  isUserPfrGmCommonApprover(approver: FundingReqApproversDto, loggedOnUser: NciPerson): boolean {
    if (approver.roleCode === 'GM' && this.hasPFRGMAPRRole(loggedOnUser)) {
      return true;
    }
    return false;
  }

  hasPFRGMAPRRole(loggedOnUser: NciPerson): boolean {
    const rolesList: I2ERoles[] = loggedOnUser.roles;
    for (const role in rolesList) {
      if (rolesList[role].roleCode === 'PFRGMAPR') {
        return true;
      }
    }
    return false;
  }

  downloadPackage() {
    this.documentService.downLoadFrqPackage(this.requestModel.requestDto.frqId,
      this.requestModel.grant.applId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Package.pdf');
        }
      ), error =>
      this.logger.error('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

}
