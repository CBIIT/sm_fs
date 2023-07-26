import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto } from '@cbiit/i2efsws-lib';
import { GrantCostPayload } from '../service/grant-cost-payload';

@Component({
  selector: 'app-projected-can-renderer',
  templateUrl: './projected-can-renderer.component.html',
  styleUrls: ['./projected-can-renderer.component.css']
})
export class ProjectedCanRendererComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() g: GrantCostPayload;
  @Input() i: number;
  @Input() projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();
  @Input() projectedApplIdCans: Map<string, CanCcxDto> = new Map<string, CanCcxDto>();

  constructor(
    private planManagementService: PlanManagementService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug(`GrantCostPayload: ${JSON.stringify(this.g)}`);
  }

  get grantCosts(): GrantCostPayload[] {
    const result: GrantCostPayload[] = this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
    if(!result || result.length === 0) {
      this.logger.error(`No grant costs found for applid ${this.grant.applId}`);
    }

      return result;
  }

}
