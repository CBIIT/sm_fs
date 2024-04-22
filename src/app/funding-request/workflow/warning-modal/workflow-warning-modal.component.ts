import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-workflow-warning-modal',
  templateUrl: './workflow-warning-modal.component.html',
  styleUrls: ['./workflow-warning-modal.component.css']
})

export class WorkflowWarningModalComponent implements OnInit {
  @ViewChild('workflowWarningModal') private modalContent: TemplateRef<WorkflowWarningModalComponent>;

  private modalRef: NgbModalRef;

  warningTypes: CanWarning;
  title = 'Approve Budget Information'

  constructor(private modalService: NgbModal,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openConfirmModal(warningTypes: CanWarning): Promise<void> {
    this.warningTypes = warningTypes;
    if(this.warningTypes.noTcsAction) {
      this.title = 'No TCS Action';
    }
    return new Promise<void>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent);
      this.modalRef.result.then(resolve, reject);
    });
  }

  submit(): void {
    this.modalRef.close();
  }

  hasWarning(type: string): boolean {
    return this.warningTypes[type];
  }

}

export interface CanWarning {
  missingCan?: boolean;
  duplicateCan?: boolean;
  nonDefaultCan?: boolean;
  noTcsAction?: boolean;
}

