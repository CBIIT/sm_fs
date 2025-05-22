import { Component, Input, OnInit } from '@angular/core';
import { FundingPlanFoasDto } from '@cbiit/i2efsws-lib';
import { ControlContainer, NgForm } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { isValid } from 'ngx-bootstrap/chronos/create/valid';
import index from 'eslint-plugin-jsdoc';


@Component({
  selector: 'app-plan-info-issue-type',
  templateUrl: './plan-info-issue-type.component.html',
  styleUrls: ['./plan-info-issue-type.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class PlanInfoIssueTypeComponent implements OnInit {
  get issueType(): string {
    return this._issueType;
  }

  set issueType(value: string) {
    this.logger.warn('Setting issue type:', value);
    this._issueType = value;
    if (this._issueType === 'REISSUE') {
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
    } else {
      this.priorNotice = '';
    }
  }
  @Input() rfaDetails: FundingPlanFoasDto;
  @Input() parentForm: NgForm;
  @Input() index: number;
  @Input() readOnly = false;

  private _issueType: string;
  priorNotice: string;
  scratch: string = null;

  constructor(private logger: NGXLogger) {
  }

  ngOnInit(): void {
    // this.logger.warn('Assigned RFA:', this.rfaDetails);
    if (this.rfaDetails.issueType) {
      this._issueType = this.rfaDetails.issueType;
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
    } else if (this.rfaDetails.prevRfaPaNumber) {
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
      this._issueType = 'REISSUE';
    } else {
      this._issueType = 'NEW';
      this.priorNotice = '';
    }
    // this.logger.warn('Issue type:', this.issueType);
  }

  isValid(): boolean {
    if (this._issueType === 'NEW' || (this._issueType === 'REISSUE' && !!this.priorNotice)) {
      return true;
    }
    return false;
  }

  lengthTooLong(): boolean {
    return this.priorNotice?.length > 13;
  }
}
