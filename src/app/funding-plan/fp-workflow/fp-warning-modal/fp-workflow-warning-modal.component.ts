import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fp-workflow-warning-modal',
  templateUrl: './fp-workflow-warning-modal.component.html',
  styleUrls: ['./fp-workflow-warning-modal.component.css']
})

export class FpWorkflowWarningModalComponent implements OnInit {
  @ViewChild('fpWorkflowWarningModal') private modalContent: TemplateRef<FpWorkflowWarningModalComponent>;

  private modalRef: NgbModalRef;

  warningTypes: FpCanWarning;

  constructor(private modalService: NgbModal,
              private logger: NGXLogger) { }

  ngOnInit(): void { }

  openConfirmModal(warningTypes: FpCanWarning): Promise<void> {
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
    return this.warningTypes[type];
  }

}

export interface FpCanWarning {
  missingCan?: boolean;
  duplicateCan?: boolean;
  nonDefaultCan?: boolean;
}

