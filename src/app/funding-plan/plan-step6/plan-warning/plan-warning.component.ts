import { Component, Input, OnInit } from '@angular/core';
import { FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { FundingPlanDocChecker } from '../plan-step6.component';

@Component({
  selector: 'app-plan-warning',
  templateUrl: './plan-warning.component.html',
  styleUrls: ['./plan-warning.component.css']
})
export class PlanWarningComponent implements OnInit {
  @Input() inFlightProposed: FundingRequestQueryDto[];
  @Input() inFlightSkipped: FundingRequestQueryDto[];
  @Input() docChecker: FundingPlanDocChecker;

  constructor() { }

  ngOnInit(): void {
  }

}
