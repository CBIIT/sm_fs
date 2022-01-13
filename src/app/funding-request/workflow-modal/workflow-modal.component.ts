import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { FsPlanWorkflowControllerService, FsWorkflowControllerService, WorkflowTaskDto } from '@cbiit/i2ecws-lib';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { Alert } from 'src/app/alert-billboard/alert';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { WorkflowActionCode } from '../workflow/workflow.model';

@Component({
  selector: 'app-workflow-modal',
  templateUrl: './workflow-modal.component.html',
  styleUrls: ['./workflow-modal.component.css']
})

export class WorkflowModalComponent implements OnInit {
  @Input() requestOrPlan: 'REQUEST'|'PLAN' = 'REQUEST';
  @ViewChild('workflowModal') private modalContent: TemplateRef<WorkflowModalComponent>;
  private modalRef: NgbModalRef;

  mode = '';
  currentStatusId: number;
  buttonText = '';
  title = '';
  comments = '';
  alert: Alert;
  constructor(private modalService: NgbModal,
              private requestModel: RequestModel,
              private planModel: PlanModel,
              private fsWorkflowService: FsWorkflowControllerService,
              private fsPlanWorkflowService: FsPlanWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openConfirmModal(mode: string, currentStatusId: number): Promise<WorkflowTaskDto> {
    this.alert = null;
    this.mode = mode;
    this.currentStatusId = currentStatusId;
    this.comments = '';
    if (this.requestOrPlan === 'REQUEST') {
      if (mode === 'WITHDRAW') {
        this.title = 'Withdraw Request';
        this.buttonText = 'Withdraw';
      }
      else if (mode === 'HOLD') {
        this.title = 'Hold Request';
        this.buttonText = 'Hold';
      }
      else if (mode === 'RELEASE') {
        this.title = 'Release Request from Hold';
        this.buttonText = 'Release Hold';
      }
      else {
        throw new Error(mode + ' is not supported in workflow modal for Funding Request');
      }
    }
    else {
      if (mode === 'WITHDRAW') {
        this.title = 'Withdraw Plan';
        this.buttonText = 'Withdraw';
      }
      else if (mode === 'HOLD') {
        this.title = 'Hold Plan';
        this.buttonText = 'Hold';
      }
      else if (mode === 'RELEASE') {
        this.title = 'Release Funding Plan from Hold';
        this.buttonText = 'Release Hold';
      }
      else {
        throw new Error(mode + ' is not supported in workflow modal for funding plan.');
      }
    }
    return new Promise<WorkflowTaskDto>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.then(resolve, reject);
    });
  }

  onSubmit(wfcForm: NgForm): void {
    if (!wfcForm.valid) {
      this.alert = {type: 'danger',
      message: 'Please correct the error identified below.',
      title: ''};
      this.logger.debug('invalid form workflow modal alert=', this.alert);
      return;
    }
    else {
      this.alert = undefined;
    }
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    if (this.requestOrPlan === 'REQUEST') {
      dto.frqId = this.requestModel.requestDto.frqId;
    }
    else {
      dto.fprId = this.planModel.fundingPlanDto.fprId;
    }
    dto.comments = this.comments;
    dto.action =  WorkflowActionCode[this.mode];
    dto.currentStatusId = this.currentStatusId;
    this.logger.debug('Modal submits workflow task dto ', dto);
    this.invokeRestApi(dto).subscribe(
      (result) => {
        this.modalRef.close(dto);
      },
      (error) => {
        this.logger.error('SubmitWorkflow service API failed with error ', error);
        this.alert = {type: 'danger',
        message: 'Error: ' + ( error.error?.errorMessage ? error.error.errorMessage : error.message ),
        title: ''};
      }
    );
  }

  invokeRestApi(dto: WorkflowTaskDto): Observable<any> {
    if (this.requestOrPlan === 'REQUEST') {
      return this.fsWorkflowService.submitWorkflowUsingPOST(dto);
    } else {
      return this.fsPlanWorkflowService.submitPlanWorkflowUsingPOST(dto);
    }
  }

}

