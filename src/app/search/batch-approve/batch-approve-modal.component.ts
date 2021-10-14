import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApprovedPlan, BatchApprovalDto, FsPlanWorkflowControllerService,
  FsWorkflowControllerService, FundingPlanQueryDto, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NgbCalendar, NgbDate, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { Alert } from 'src/app/alert-billboard/alert';
import { AppPropertiesService } from 'src/app/service/app-properties.service';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { BatchApproveService } from './batch-approve.service';


@Component({
  selector: 'app-batch-approve-modal',
  templateUrl: './batch-approve-modal.component.html',
  styleUrls: ['./batch-approve-modal.component.css']
})

export class BatchApproveModalComponent implements OnInit {
  @ViewChild('batchApproveModal') private modalContent: TemplateRef<BatchApproveModalComponent>;
  private modalRef: NgbModalRef;

  requestsForApproval: FundingRequestQueryDto[];
  plansForApproval: FundingPlanQueryDto[];
  splMeetingDate: string;
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
    this.requestsForApproval = requests;
    this.requestOrPlan = 'REQUEST';
    this.mode = this.batchApproveService.isDoc ? 'DOC' : 'SPL';
    this.title = 'Request(s) Selected for Batch Approval';
    this.buttonText = 'Confirm Approve';
    this.eligibleCount = this.totalCount = requests.length;
    return new Promise<void>( (finalize) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.finally(finalize);
    });
  }

  openModalForPlans(plans: FundingPlanQueryDto[]):
  Promise<void> {
    this.alert = null;
    this.batchApproveSuccess = false;
    this.plansForApproval = plans;
    this.requestOrPlan = 'PLAN';
    this.mode = this.batchApproveService.isDoc ? 'DOC' : 'SPL';
    this.title = 'Plan(s) Selected for Batch Approval';
    this.buttonText = 'Conform Approve';
    this.eligibleCount = this.totalCount = plans.length;
    return new Promise<void>( (finalize) => {
      this.modalRef = this.modalService.open(this.modalContent);
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
//    dto.actionUserId = 'BINLI';
    if (this.requestOrPlan === 'REQUEST') {
      const approvedRequests = this.requestsForApproval.map( r => r.frqId);
      dto.approvedRequests = approvedRequests;
    }
    else {
      const approvedPlans: ApprovedPlan[] = this.plansForApproval.map( r => {
        return {fprId: r.fprId, splMeetingDate: this.splMeetingDate};
      });
      dto.approvedPlans = approvedPlans;
    }
    this.logger.debug('Modal submits batch approval dto ', dto);
//    return;
    this.invokeRestApi(dto).subscribe(
      (result) => {
        this.batchApproveSuccess = true;
        this.disableSubmit = true;
      },
      (errorResponse) => {
        this.alert =  {type: 'danger',
        message: 'Batch Approval Failed: ' +
        ( errorResponse.error?.errorMessage ? errorResponse.error.errorMessage : errorResponse.message),
        title: ''};
      }
    );
  }

  invokeRestApi(dto: BatchApprovalDto): Observable<any> {
    if (this.requestOrPlan === 'REQUEST') {
      return this.fsWorkflowService.batchApproveRequestsUsingPOST(dto);
    } else {
      return this.fsPlanWorkflowService.batchApprovePlansUsingPOST(dto);
    }
  }

}

