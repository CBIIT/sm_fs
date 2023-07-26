import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  ApprovedPlan,
  BatchApprovalDto,
  FsPlanWorkflowControllerService,
  FsWorkflowControllerService,
  FundingPlanQueryDto,
  FundingRequestQueryDto
} from '@cbiit/i2efsws-lib';
import {
  NgbCalendar,
  NgbDate,
  NgbDateParserFormatter,
  NgbDateStruct,
  NgbModal,
  NgbModalRef
} from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { Alert } from 'src/app/alert-billboard/alert';
import { AppPropertiesService , DatepickerFormatter } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { BatchApproveService } from './batch-approve.service';
import { convertNcabs } from 'src/app/utils/utils';


@Component({
  selector: 'app-batch-approve-modal',
  templateUrl: './batch-approve-modal.component.html',
  styleUrls: ['./batch-approve-modal.component.css'],
  providers: [
    { provide: NgbDateParserFormatter, useClass: DatepickerFormatter }
  ]
})

export class BatchApproveModalComponent implements OnInit {
  @ViewChild('batchApproveModal') private modalContent: TemplateRef<BatchApproveModalComponent>;
  private modalRef: NgbModalRef;

  requestsForApproval: FundingRequestQueryDto[];
  plansForApproval: FundingPlanQueryDto[];
  splMeetingDate: NgbDateStruct;
  maxDate: NgbDate = this.calendar.getToday();

  requestOrPlan: 'REQUEST'|'PLAN';
  mode: 'DOC'|'SPL';
  buttonText = '';
  title = '';
  alert: Alert;

  eligibleCount: number;
  totalCount: number;
  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  eGrantsUrl: string = this.propertiesService.getProperty('EGRANTS_URL');

  batchApproveSuccess = false;
  disableSubmit = false;
  constructor(private modalService: NgbModal,
              private fsWorkflowService: FsWorkflowControllerService,
              private fsPlanWorkflowService: FsPlanWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private propertiesService: AppPropertiesService,
              private batchApproveService: BatchApproveService,
              private calendar: NgbCalendar,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openModalForRequests(requests: FundingRequestQueryDto[]):
  Promise<void> {
    this.alert = null;
    this.batchApproveSuccess = false;
    this.requestsForApproval = requests.filter(r => this.batchApproveService.canApproveRequest(r.frqId));
    this.requestOrPlan = 'REQUEST';
    this.mode = this.batchApproveService.isSpl() ? 'SPL' : 'DOC';
    this.title = 'Request(s) Selected for Batch Approval';
    this.buttonText = 'Confirm Approve';
    this.eligibleCount = this.requestsForApproval.length;
    this.totalCount = requests.length;
    this.disableSubmit = this.eligibleCount < 1;
    return new Promise<void>( (finalize) => {
      this.modalRef = this.modalService.open(this.modalContent, { size: 'lg' });
      this.modalRef.result.finally(finalize);
    });
  }

  openModalForPlans(plans: FundingPlanQueryDto[]):
  Promise<void> {
    this.alert = null;
    this.batchApproveSuccess = false;
    this.plansForApproval = plans.filter( p => this.batchApproveService.canApprovePlan(p.fprId) );
    this.requestOrPlan = 'PLAN';
    this.mode = this.batchApproveService.isSpl() ? 'SPL' : 'DOC';
    this.title = 'Plan(s) Selected for Batch Approval';
    this.buttonText = 'Confirm Approve';
    this.eligibleCount = this.plansForApproval.length;
    this.totalCount = plans.length;
    this.disableSubmit = this.eligibleCount < 1;
    return new Promise<void>( (finalize) => {
      this.modalRef = this.modalService.open(this.modalContent, { size: 'lg' });
      this.modalRef.result.finally(finalize);
    });
  }

  close(): void {
    this.modalRef.close();
  }

  onSubmit(wfcForm: NgForm): void {
    if (!wfcForm.valid) {
      this.alert = {type: 'danger',
      message: 'Please correct the error identified below.',
      title: ''};
      this.logger.debug('invalid batch-approve form ', wfcForm);
      return;
    }
    else {
      this.alert = undefined;
    }

    const dto: BatchApprovalDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    if (this.requestOrPlan === 'REQUEST') {
      const approvedRequests = this.requestsForApproval.map( r => r.frqId);
      dto.approvedRequests = approvedRequests;
    }
    else {
      const splMeetingDate2 = (!this.splMeetingDate) ? null : (
      String(this.splMeetingDate.month).padStart(2, '0') + '/' +
      String(this.splMeetingDate.day).padStart(2, '0') + '/' +
      String(this.splMeetingDate.year).padStart(4, '0') ) ;
      const approvedPlans: ApprovedPlan[] = this.plansForApproval.map( r => {
        return {fprId: r.fprId, splMeetingDate: splMeetingDate2};
      });
      dto.approvedPlans = approvedPlans;
    }
    this.logger.debug('Modal submits batch approval dto ', dto);
    this.invokeRestApi(dto).subscribe(
      () => {
        this.batchApproveSuccess = true;
        this.batchApproveService.initialize();
        this.disableSubmit = true;
      },
      (errorResponse) => {
        const errorMessage = errorResponse.error?.errorMessage ? errorResponse.error.errorMessage : errorResponse.message;
        this.alert =  {type: 'danger',
        message: 'Batch Approval Failed: ' + errorMessage,
        title: ''};
      }
    );
  }

  invokeRestApi(dto: BatchApprovalDto): Observable<any> {
    if (this.requestOrPlan === 'REQUEST') {
      return this.fsWorkflowService.batchApproveRequests(dto);
    } else {
      return this.fsPlanWorkflowService.batchApprovePlans(dto);
    }
  }
  convert(ncabs: string ): string {
    return convertNcabs(ncabs);
  }
}

