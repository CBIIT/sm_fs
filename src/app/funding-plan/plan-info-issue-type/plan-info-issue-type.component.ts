import { Component, Input, OnInit } from '@angular/core';
import { FundingPlanFoasDto, RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';

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

  constructor(private planModel: PlanModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (!!this.rfaDetails.issueType) {
      this.issueType = this.rfaDetails.issueType;
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
      this.logger.debug('restoring: ', this.issueType, this.priorNotice);
    } else if (this.rfaDetails.prevRfaPaNumber) {
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
      this.issueType = 'reissue';
    } else {
      this.issueType = 'new';
      this.priorNotice = '';
    }
  }

  toggleDisplay(value: string): void {
    this.issueType = value;
    if (this.issueType === 'reissue') {
      this.priorNotice = this.rfaDetails.prevRfaPaNumber;
    } else {
      this.priorNotice = '';
    }
  }

  isValid(): boolean {
    if (this.issueType === 'new' || (this.issueType === 'reissue' && !!this.priorNotice)) {
      return true;
    }
    return false;
  }
}
