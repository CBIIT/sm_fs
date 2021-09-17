import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { GrantCostPayload, PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-funding-source-renderer',
  templateUrl: './funding-source-renderer.component.html',
  styleUrls: ['./funding-source-renderer.component.css']
})
export class FundingSourceRendererComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;

  constructor(
    private planManagementService: PlanManagementService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
  }

  get grantCosts(): GrantCostPayload[] {
    return this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
  }

}
