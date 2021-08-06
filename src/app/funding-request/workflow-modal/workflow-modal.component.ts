import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { FsWorkflowControllerService, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Alert } from 'src/app/alert-billboard/alert';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { WorkflowActionCode } from '../workflow/workflow.model';

@Component({
  selector: 'app-workflow-modal',
  templateUrl: './workflow-modal.component.html',
  styleUrls: ['./workflow-modal.component.css']
})

export class WorkflowModalComponent implements OnInit {
  @ViewChild('workflowModal') private modalContent: TemplateRef<WorkflowModalComponent>;
  private modalRef: NgbModalRef;

  mode = '';
  buttonText = '';
  title = '';
  comments = '';
  alert: Alert;
  constructor(private modalService: NgbModal,
              private requestModel: RequestModel,
              private fsWorkflowService: FsWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openConfirmModal(mode: string): Promise<WorkflowTaskDto> {
    this.alert = null;
    this.mode = mode;
    this.comments = '';
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
      throw new Error(mode + ' is not supported in workflow modal');
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
    dto.frqId = this.requestModel.requestDto.frqId;
    dto.comments = this.comments;
    dto.action =  WorkflowActionCode[this.mode];
    this.logger.debug('Modal submits workflow task dto ', dto);
    this.fsWorkflowService.submitWorkflowUsingPOST(dto).subscribe(
//    this.invokeRestApi(dto).subscribe(
      (result) => {
        this.modalRef.close(dto);
      },
      (error) => {
        this.logger.error('SubmitWorkflow service API failed with error ', error);
      }
    );
  }

  // invokeRestApi(dto: WorkflowTaskDto): Observable<any> {
  //   // const dto: WorkflowTaskDto = {};
  //   // dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
  //   // dto.frqId = this.requestModel.requestDto.frqId;
  //   // dto.comments = this.comments;
  //   // dto.action =  WorkflowActionCode[mode];
  //   if (dto.action === 'WITHDRAW') {
  //     return this.fsWorkflowService.withdrawRequestUsingPOST(dto);
  //   } else if (dto.action === 'HOLD') {
  //     return this.fsWorkflowService.holdRequestUsingPOST(dto);
  //   }
  //   else {
  //     throw new Error(dto.action + ' is not supported in funding request workflow');
  //   }
  // }

}

