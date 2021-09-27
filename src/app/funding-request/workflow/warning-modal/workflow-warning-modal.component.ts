import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { FsPlanWorkflowControllerService, FsWorkflowControllerService, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';
import { Alert } from 'src/app/alert-billboard/alert';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Component({
  selector: 'app-workflow-warning-modal',
  templateUrl: './workflow-warning-modal.component.html',
  styleUrls: ['./workflow-warning-modal.component.css']
})

export class WorkflowWarningModalComponent implements OnInit {
  @ViewChild('workflowWarningModal') private modalContent: TemplateRef<WorkflowWarningModalComponent>;

  private modalRef: NgbModalRef;

  warningTypes: string[];

  constructor(private modalService: NgbModal,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openConfirmModal(warningTypes: string[]): Promise<void> {
    this.warningTypes = warningTypes;
    return new Promise<void>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.then(resolve, reject);
    });
  }

  submit(): void {
    this.modalRef.close();
  }

  hasWarning(type: string): boolean {
    return this.warningTypes?.includes(type);
  }

}

