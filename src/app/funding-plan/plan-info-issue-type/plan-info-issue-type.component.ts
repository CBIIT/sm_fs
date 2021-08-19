import { Component, Input, OnInit } from '@angular/core';
import { RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-plan-info-issue-type',
  templateUrl: './plan-info-issue-type.component.html',
  styleUrls: ['./plan-info-issue-type.component.css']
})
export class PlanInfoIssueTypeComponent implements OnInit {
  @Input() rfaDetails: RfaPaNoticesDto;
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
    if(this.issueType === 'reissue') {
      this.priorNotice = this.rfaDetails.priorNoticeNumber;
    } else {
      this.priorNotice = '';
    }
  }
}
