import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';
import { GrantCostPayload } from '../service/grant-cost-payload';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-funding-source-renderer',
  templateUrl: './funding-source-renderer.component.html',
  styleUrls: ['./funding-source-renderer.component.css']
})
export class FundingSourceRendererComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() g: GrantCostPayload;
  sourceOrder: number[];

  constructor(
    private planManagementService: PlanManagementService,
    private planModel: PlanModel,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.sourceOrder = this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.map(s => s.fundingSourceId);
    this.logger.debug('source Order: ', this.sourceOrder);
  }

  get grantCosts(): GrantCostPayload[] {
    return this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
  }

}
