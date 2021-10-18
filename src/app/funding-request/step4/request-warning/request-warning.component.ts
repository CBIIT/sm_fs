import { Component, Input, OnInit } from '@angular/core';
import { FundingPlanDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-request-warning',
  templateUrl: './request-warning.component.html',
  styleUrls: ['./request-warning.component.css']
})
export class RequestWarningComponent implements OnInit {
  @Input() inflightPlan: FundingPlanDto;

  constructor() { }

  ngOnInit(): void {
  }
}
