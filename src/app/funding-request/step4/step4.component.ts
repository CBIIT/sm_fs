import {ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request/request-model';
import {AppPropertiesService} from '../../service/app-properties.service';
import {
  DocumentsDto,
  FsRequestControllerService,
  FundingReqApproversDto,
  FundingReqStatusHistoryDto,
  FundingRequestDtoReq,
  NciPfrGrantQueryDto
} from '@nci-cbiit/i2ecws-lib';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';
import {FundingRequestIntegrationService} from '../integration/integration.service';
import {Subscription} from 'rxjs';
import {DocumentService} from '../../service/document.service';
import {saveAs} from 'file-saver';
import {HttpResponse} from '@angular/common/http';
import {NGXLogger} from 'ngx-logger';
import {WorkflowModalComponent} from '../workflow-modal/workflow-modal.component';

@Component({
  selector: 'app-step4',
  templateUrl: './step4.component.html',
  styleUrls: ['./step4.component.css']
})
export class Step4Component implements OnInit, OnDestroy {

  @ViewChild('submitResult') submitResultElement: ElementRef;
  @ViewChild(WorkflowModalComponent) workflowModal: WorkflowModalComponent;

  statusesCanWithdraw = ['SUBMITTED', 'ON HOLD', 'RFC'];
  statusesCanOnHold = ['SUBMITTED'];

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  isRequestEverSubmitted = false;
  requestHistorySubscriber: Subscription;
  activeApproverSubscriber: Subscription;
  submissionResult: { status: 'success' | 'failure' | '', frqId?: number, approver?: FundingReqApproversDto, errorMessage?: string }
    = {status: ''};
  requestStatus: string;
  docDtos: DocumentsDto[];
  readonly = false;
  readonlyStatuses = ['SUBMITTED'];
  comments = '';
  activeApprover: FundingReqApproversDto;

  userCanSubmit = false;
  userCanDelete = false;
  userReadonly = true;
  justificationMissing = false;
  transitionMemoMissing = false;

  constructor(private router: Router,
              private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private documentService: DocumentService,
              private changeDetection: ChangeDetectorRef,
              private logger: NGXLogger) {
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
    this.logger.debug('Step4 requestModel: ', this.requestModel);
    this.requestModel.setStepLinkable(4, true);
    this.requestHistorySubscriber = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );
    this.activeApproverSubscriber = this.requestIntegrationService.activeApproverEmitter.subscribe(
      (approver) => {
        this.setActiveApprover(approver);
      }
    );
    this.docDtos = this.requestModel.requestDto.includedDocs;
    this.checkUserRolesCas();
    this.checkDocs();
  }

  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    let submitted = false;
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      this.logger.debug('Parse Request History: ', item);
      const i = item.statusDescrip.search(/ by /gi);
      if (i > 0) {
        item.statusDescrip = item.statusDescrip.substring(0, i);
      }

      if (item.statusCode === 'SUBMITTED') {
        submitted = true;
      }

      if (!item.endDate) {
        this.requestStatus = item.statusCode;
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
    if (!isPd && !isPa) {
      this.logger.debug('Neither PD or PA, submit & delete = false');
      this.userCanDelete = false;
      this.userCanSubmit = false;
      this.userReadonly = true;
      return;
    } else if (isPd && userNpnId === this.requestModel.requestDto.financialInfoDto.requestorNpnId) {
      this.logger.debug('PD & is this requestor, submit & delete = true');
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else if (isPd && (userCas !== null) && (userCas.length > 0)
      && (userCas.indexOf(this.requestModel.requestDto.financialInfoDto.requestorCayCode) > -1)) {
      this.logger.debug('PD & CA matches request\'s CA, submit & delete = true');
      this.userCanSubmit = true;
      this.userCanDelete = true;
      this.userReadonly = false;
      return;
    } else if ((isPa || isPd) && userId === this.requestModel.requestDto.requestCreateUserId) {
      this.logger.debug('PA or PD & is request creator, submit = false, delete = true');
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
          if (doc.docType === 'TransitionMemo') {
            this.transitionMemoMissing = false;
            break;
          }
        }
      }
    }
  }

  prevStep(): void {
    this.requestModel.clearAlerts();
    this.router.navigate(['/request/step3']);
  }

  setActiveApprover(event): void {
    this.logger.debug('setActiveApprover', event);
    this.activeApprover = event;
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
    const submissionDto: FundingRequestDtoReq = {};
    // submitRequest method only needs following properties in Dto
    submissionDto.frqId = this.requestModel.requestDto.frqId;
    submissionDto.requestorNpeId = this.requestModel.requestDto.requestorNpeId;
    submissionDto.userLdapId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    submissionDto.certCode = this.requestModel.requestDto.certCode;
    submissionDto.comments = this.comments;
    this.logger.debug('Submit Request for: ', submissionDto);
    this.fsRequestService.submitRequestUsingPOST(submissionDto).subscribe(
      (result) => {
        this.logger.debug('Submit Request result: ', result);
        this.submissionResult = {status: 'success', frqId: submissionDto.frqId, approver: this.activeApprover};
        this.requestIntegrationService.requestSubmissionEmitter.next(submissionDto);
        this.submitResultElement.nativeElement.scrollIntoView();
        this.readonly = true;
        this.requestModel.disableStepLinks();
      },
      (error) => {
        this.logger.error('Failed when calling submitRequestUsingPOST', error);
        this.submissionResult = {status: 'failure'};
        if (error.error) {
          this.submissionResult.errorMessage = error.error.errorMessage;
        }
        this.submitResultElement.nativeElement.scrollIntoView();
      });
  }

  submitWorkflow(action: string): void {
    this.workflowModal.openConfirmModal(action).then(
      (result) => {
        this.logger.debug(action + ' API call returned successfully', result);
        this.requestIntegrationService.requestSubmissionEmitter.next();
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
    return this.userCanSubmit && this.requestStatus === 'DRAFT';
  }

  deleteVisible(): boolean {
    return this.userCanDelete && !this.isRequestEverSubmitted;
  }

  submitEnabled(): boolean {
    return !this.justificationMissing && !this.transitionMemoMissing;
  }

  submitDisableTooltip(): string {
    if (this.justificationMissing && this.transitionMemoMissing) {
      return 'You must upload Justification and Transition Memo to submit this request.';
    }
    else if (this.justificationMissing) {
      return 'You must upload Justification to submit this request.';
    }
    else if (this.transitionMemoMissing) {
      return 'You must upload Transition Memo to submit this request.';
    }
    else {
      return '';
    }
  }

  downloadCoverSheet(): void {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], {type: response.headers.get('content-type')});
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
            const blob = new Blob([response.body], {type: response.headers.get('content-type')});
            saveAs(blob, fileName);
          }
        );
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

}
