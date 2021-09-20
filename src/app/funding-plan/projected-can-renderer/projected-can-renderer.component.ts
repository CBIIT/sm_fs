import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { GrantCostPayload, PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-projected-can-renderer',
  templateUrl: './projected-can-renderer.component.html',
  styleUrls: ['./projected-can-renderer.component.css']
})
export class ProjectedCanRendererComponent implements OnInit {
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