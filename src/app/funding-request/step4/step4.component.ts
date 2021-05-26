import {ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {AppPropertiesService} from '../../service/app-properties.service';
import {FsRequestControllerService, FundingReqStatusHistoryDto,
  NciPfrGrantQueryDto, FundingRequestDtoReq, DocumentsDto,
  FsWorkflowControllerService} from '@nci-cbiit/i2ecws-lib';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';
import {FundingRequestIntegrationService} from '../integration/integration.service';
import {Subscription} from 'rxjs';
import { DocumentService } from '../../service/document.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-step4',
  templateUrl: './step4.component.html',
  styleUrls: ['./step4.component.css']
})
export class Step4Component implements OnInit, OnDestroy {

  @ViewChild('submitSuccess') submitSuccess: ElementRef;

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  isRequestEverSubmitted = false;
  requestHistorySubscriber: Subscription;
  submissionResult = {frqId: null, approver: null};
  dv = true;
  requestStatus: string;
  docDtos: DocumentsDto[];

  constructor(private router: Router,
              private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestService: FsRequestControllerService,
              private fsWorkflowService: FsWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private documentService: DocumentService,
              private changeDetection: ChangeDetectorRef) {
  }

  ngOnDestroy(): void {
    if (this.requestHistorySubscriber) {
      this.requestHistorySubscriber.unsubscribe();
    }
  }

  ngOnInit(): void {
    console.log('Step4 requestModel ', this.requestModel);
    this.requestHistorySubscriber = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );
    this.docDtos = this.requestModel.requestDto.includedDocs;

    if (!this.requestModel.mainApproverCreated) {
      this.createApprovers();
    }
    else if ( this.requestModel.recreateMainApproverNeeded) {
      this.fsWorkflowService.deleteRequestApproversUsingGET(this.requestModel.requestDto.frqId).subscribe(
        () => {
          this.requestModel.mainApproverCreated = false;
          this.createApprovers(); },
        (error) => {}
      );
    }
  }

  createApprovers(): void {
    const workflowDto = {frqId: this.requestModel.requestDto.frqId, requestorNpeId: this.userSessionService.getLoggedOnUser().npnId };
    this.fsWorkflowService.createRequestApproversUsingPOST(workflowDto).subscribe(
      () => {
        this.requestModel.mainApproverCreated = true;
        console.log('create main approvers called and returned '); },
      (error) => {

      }
    );
  }


  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    let submitted = false;
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      console.log('inside loop of parseRequestHistories ', item);
      // const i = item.statusDescrip.indexOf(' by ');
      const i = item.statusDescrip.search(/ by /gi);
      if (i > 0) {
        item.statusDescrip = item.statusDescrip.substring(0, i);
      }

      if (item.statusCode === 'SUBMITTED') {
        console.log('isRequestEverSubmitted=true');
        submitted = true;
      }

      if (!item.endDate) {
        this.requestStatus = item.statusCode;
      }

    });
    this.isRequestEverSubmitted = submitted;
    this.changeDetection.detectChanges();
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
      console.log('Call deleteRequest API for frqId ', this.model.requestDto.frqId);
      this.fsRequestService.deleteRequestUsingDELETE(this.model.requestDto.frqId).subscribe(
        result => {
          console.log('Call API to delete completed route to /search, API returned ', result);
          this.router.navigate(['/search']);
        },
        error => {
          console.log('Error when calling delelteRequest API ', error);
        }
      );
    }
  }

  submitRequest(): void {
    const submissionDto: FundingRequestDtoReq = {};
    // submitRequest DAO method only needs following parameters
    submissionDto.frqId = this.requestModel.requestDto.frqId;
    submissionDto.requestorNpeId = this.requestModel.requestDto.requestorNpeId;
    submissionDto.certCode = this.requestModel.requestDto.certCode;
    submissionDto.comments = this.requestModel.requestDto.comments;
    console.log('submitRquest, requestDto=', submissionDto);
    this.fsRequestService.submitRequestUsingPOST(submissionDto).subscribe(
      (result) => {
        console.log('calling submitRequestUsingPost successful, it returns', result);
        this.submissionResult = {frqId: submissionDto.frqId, approver: 'Mr. Approver'};
        this.requestIntegrationService.requestSubmissionEmitter.next(submissionDto.frqId);
        this.submitSuccess.nativeElement.scrollIntoView();
      },
      (error) => {
        console.log('Failed when calling submitRequestUsingPOST', error);
      });
  }

  userCanSubmitAndDelete(): boolean {
    if (this.userSessionService.isPD())
      // need to add checks whether loggedOn user is the requesting pd or if the logged on user's CA
      // is the same as the requesting pd's CA && this.userSessionService.getLoggedOnUser().npnId === this.model.requestDto.requestorNpnId)
      // TODO: Bin, I have put validation logic on the request model for saving a request.  You could also put submit validation there.
    {
      return true;
    } else {
      return false;
    }
  }

  submitVisible(): boolean {
    return this.userCanSubmitAndDelete() && this.requestStatus === 'DRAFT';
  }

  deleteVisible(): boolean {
    return this.userCanSubmitAndDelete() && !this.isRequestEverSubmitted;
  }

  submitEnabled(): boolean {
    return this.requestModel.canSubmit();
  }

  submitDisableTooltip(): string {
    /*
    Justification is required for ALL request types
    Justification and Memo are required for PayType 4

    so depending on the type and missing doc, tool tip has to be created accordingly.
    */
    return 'You must upload Justification and Transition Memo to submit this request.';
  }

  downloadCoverSheet() {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId).subscribe(blob => saveAs(blob, 'Cover Page.pdf')), error =>
      console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  downloadFile(id: number, fileName: string) {
    if (fileName === 'Summary Statement') {
      this.downloadSummaryStatement();
    } else {
      this.documentService.downloadById(id).subscribe(blob => saveAs(blob, fileName)), error =>
        console.log('Error downloading the file'),
        () => console.info('File downloaded successfully');
    }

  }

  downloadSummaryStatement() {
    this.documentService.downloadFrqSummaryStatement(this.requestModel.grant.applId).subscribe(blob => saveAs(blob, 'Summary Statement.pdf')), error =>
      console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

}
