import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NGXLogger } from 'ngx-logger';
import { GrantCostPayload, PlanManagementService } from '../service/plan-management.service';

@Component({
  selector: 'app-grant-cost-renderer',
  templateUrl: './grant-cost-renderer.component.html',
  styleUrls: ['./grant-cost-renderer.component.css']
})
export class GrantCostRendererComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() mode: string;

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

