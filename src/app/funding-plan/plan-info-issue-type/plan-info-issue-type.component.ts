import { Component, Input, OnInit } from '@angular/core';
import { RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
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
  @Input() rfaDetails: RfaPaNoticesDto;
  @Input() parentForm: NgForm;
  @Input() index: number;
  issueType: string;
  priorNotice: string;

  constructor(private planModel: PlanModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (this.rfaDetails.priorNoticeNumber) {
      this.priorNotice = this.rfaDetails.priorNoticeNumber;
      this.issueType = 'reissue';
    } else {
      this.issueType = 'new';
      this.priorNotice = '';
    }
  }

  toggleDisplay(value: string): void {
    this.issueType = value;
    if (this.issueType === 'reissue') {
      this.priorNotice = this.rfaDetails.priorNoticeNumber;
    } else {
      this.priorNotice = '';
    }
  }

  uniqueId(prefix: string): string {
    return prefix + this.rfaDetails.noticeNumber;

  }
}
