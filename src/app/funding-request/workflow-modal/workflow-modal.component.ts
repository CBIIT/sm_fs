import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FsWorkflowControllerService, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { RequestModel } from 'src/app/model/request-model';
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

  constructor(private modalService: NgbModal,
              private requestModel: RequestModel,
              private fsWorkflowService: FsWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openConfirmModal(mode: string): Promise<boolean> {
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
    else {
      throw new Error(mode + ' is not supported in workflow modal');
    }
    return new Promise<boolean>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.then(resolve, reject);
    });
  }

  submit(): void {
    this.invokeRestApi(this.mode).subscribe(
      (result) => {
        this.modalRef.close(result);
      },
      (error) => {
        this.logger.error('calling ' + this.mode + ' service API failed with error ', error);
      }
    );
  }

  invokeRestApi(mode: string): Observable<any> {
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.frqId = this.requestModel.requestDto.frqId;
    dto.comments = this.comments;
    dto.action =  WorkflowActionCode[mode];
    if (mode === 'WITHDRAW') {
      return this.fsWorkflowService.withdrawRequestUsingPOST(dto);
    } else if (mode === 'HOLD') {
      return this.fsWorkflowService.holdRequestUsingPOST(dto);
    }
    else {
      throw new Error(mode + ' is not supported in funding request workflow');
    }
  }

}

