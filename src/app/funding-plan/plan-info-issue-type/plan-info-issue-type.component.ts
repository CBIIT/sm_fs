import { Component, Input, OnInit } from '@angular/core';
import { FundingPlanFoasDto } from '@nci-cbiit/i2ecws-lib';
import { ControlContainer, NgForm } from '@angular/forms';
import { NGXLogger } from 'ngx-logger';


@Component({
  selector: 'app-plan-info-issue-type',
  templateUrl: './plan-info-issue-type.component.html',
  styleUrls: ['./plan-info-issue-type.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class PlanInfoIssueTypeComponent implements OnInit {
  @Input() rfaDetails: FundingPlanFoasDto;
  @Input() parentForm: NgForm;
  @Input() index: number;
  @Input() readOnly = false;

  issueType: string;
  priorNotice: string;
  scratch: string = null;

  constructor(private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug(this.rfaDetails);
    if (!!this.rfaDetails.issueType) {
      this.issueType = this.rfaDetails.issueType;
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
    } else if (this.rfaDetails.prevRfaPaNumber) {
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
      this.issueType = 'REISSUE';
    } else {
      this.issueType = 'NEW';
      this.priorNotice = '';
    }
  }

  toggleDisplay(value: string): void {
    this.issueType = value;
    if (this.issueType === 'REISSUE') {
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
    } else {
      this.priorNotice = '';
    }
  }

  isValid(): boolean {
    if (this.issueType === 'NEW' || (this.issueType === 'REISSUE' && !!this.priorNotice)) {
      return true;
    }
    return false;
  }

  lengthTooLong(): boolean {
    return this.priorNotice?.length > 13;
  }
}
