import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApprovedPlan, BatchApprovalDto, FsPlanWorkflowControllerService,
  FsWorkflowControllerService, FundingPlanQueryDto, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { Alert } from 'src/app/alert-billboard/alert';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';


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

  requestOrPlan: 'REQUEST'|'PLAN';
  mode: 'DOC'|'SPL';
  buttonText = '';
  title = '';
  alert: Alert;

  eligibleCount: number;
  totalCount: number;

  constructor(private modalService: NgbModal,
              private fsWorkflowService: FsWorkflowControllerService,
              private fsPlanWorkflowService: FsPlanWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openModalForRequests(requests: FundingRequestQueryDto[], mode: 'DOC'|'SPL'):
  Promise<BatchApprovalDto> {
    this.alert = null;
    this.requestsForApproval = requests;
    this.requestOrPlan = 'REQUEST';
    this.mode = mode;
    this.title = 'Request(s) Selected for Batch Approval';
    this.buttonText = 'Confirm Approve';
    this.eligibleCount = this.totalCount = requests.length;
    return new Promise<BatchApprovalDto>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.then(resolve, reject);
    });
  }

  openModalForPlans(plans: FundingPlanQueryDto[], mode: 'DOC'|'SPL'):
  Promise<BatchApprovalDto> {
    this.alert = null;
    this.plansForApproval = plans;
    this.requestOrPlan = 'PLAN';
    this.mode = mode;
    this.title = 'Plan(s) Selected for Batch Approval';
    this.buttonText = 'Conform Approve';
    this.eligibleCount = this.totalCount = plans.length;
    return new Promise<BatchApprovalDto>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.then(resolve, reject);
    });
  }

  close(): void {
    this.modalRef.dismiss();
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
      const approvedPlans: ApprovedPlan[] = this.plansForApproval.map( r => {
        return {fprId: r.fprId, splMeetingDate: this.splMeetingDate};
      });
      dto.approvedPlans = approvedPlans;
    }
    this.logger.debug('Modal submits batch approval dto ', dto);
//    this.fsWorkflowService.submitWorkflowUsingPOST(dto).subscribe(
    this.invokeRestApi(dto).subscribe(
      (result) => {
        this.modalRef.close(dto);
      },
      (error) => {
        this.logger.error('SubmitWorkflow service API failed with error ', error);
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

