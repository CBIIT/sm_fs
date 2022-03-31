import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FundingRequestQueryDto } from '@cbiit/i2ecws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
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

  grantViewerUrl: string;

  constructor(private propertiesService: AppPropertiesService,
              private router: Router) { }

  ngOnInit(): void {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  }

}
