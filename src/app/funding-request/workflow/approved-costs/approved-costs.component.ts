import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { FsCanControllerService, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { INITIAL_PAY_TYPES } from 'src/app/model/request/funding-request-types';
import { RequestModel } from 'src/app/model/request/request-model';
import { WorkflowActionCode, WorkflowModel } from '../workflow.model';

@Component({
  selector: 'app-approved-costs',
  templateUrl: './approved-costs.component.html',
  styleUrls: ['./approved-costs.component.css']
})
export class ApprovedCostsComponent implements OnInit, AfterViewInit {

  @Input() approvingState = false;
  @ViewChild('acform', {static: false}) acform: NgForm;

  initialPay: boolean;
  inputDisabled = true;
  originalValue: any;

  constructor(private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) { }

  ngAfterViewInit(): void {
    this.originalValue = this.acform.value;
    this.logger.debug('ngAfterViewInit value ', this.originalValue);
  }

  ngOnInit(): void {
    this.initialPay = INITIAL_PAY_TYPES.includes(this.requestModel.requestDto?.frtId);
  //  setInterval(() => { this.logger.debug(this.acform); this.logger.debug('cans value', this.cans); }, 1000);
  }

  get cans(): FundingRequestCanDto[]{
    return this.requestModel.requestCans;
  }

  isFormValid(): boolean {
    return this.acform?.valid;
  }

  resetForm(action: WorkflowActionCode): void {
    if (this.workflowModel.isScientificApprover
      && this.workflowModel.isApprovalAction(action)
      && this.inputDisabled) {
      this.inputDisabled = false;
    } else if (!this.inputDisabled){
        // this.logger.debug('resetform value ', this.originalValue);
        // this.acform.resetForm(this.originalValue);
        this.requestModel.requestCans.forEach( rc => rc.approvedFutureYrs = rc.previousAfy );
        this.inputDisabled = true;
    }
  }

  get editable(): boolean {
    return this.workflowModel.isScientificApprover && this.approvingState;
  }

}
