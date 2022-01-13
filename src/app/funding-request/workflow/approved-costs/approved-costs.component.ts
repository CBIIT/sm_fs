import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { FundingRequestCanDto } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { INITIAL_PAY_TYPES } from 'src/app/model/request/funding-request-types';
import { RequestModel } from 'src/app/model/request/request-model';
import { WorkflowActionCode, WorkflowModel } from '../workflow.model';

@Component({
  selector: 'app-approved-costs',
  templateUrl: './approved-costs.component.html',
  styleUrls: ['./approved-costs.component.css']
})
export class ApprovedCostsComponent implements OnInit {

  @Input() approvingState = false;
  @ViewChild('acform', {static: false}) acform: NgForm;

  initialPay: boolean;
  inputDisabled = false;
  showDirectCosts = false;

  constructor(public requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) { }


  ngOnInit(): void {
    this.initialPay = INITIAL_PAY_TYPES.includes(this.requestModel.requestDto?.frtId);
    this.requestModel.requestCans.forEach(c => {
      if(c.approvedDc && c.approvedDc > 0) {
        this.showDirectCosts = true;
      }
    });
  }

  isFormValid(): boolean {
    return this.acform?.valid;
  }

  get editable(): boolean {
    return this.workflowModel.isScientificApprover && this.approvingState;
  }

}
