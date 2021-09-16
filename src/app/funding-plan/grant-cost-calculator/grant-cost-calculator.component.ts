import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';

export interface GrantCostPayload {
  applId: number;
  fseId: number;
  fundingSourceName: string;
  approvedDirect: number;
  approvedTotal: number;
}

@Component({
  selector: 'app-grant-cost-calculator',
  templateUrl: './grant-cost-calculator.component.html',
  styleUrls: ['./grant-cost-calculator.component.css']
})
export class GrantCostCalculatorComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() mode: string;
  grantCosts: GrantCostPayload[];

  constructor(
    private planModel: PlanModel,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    switch (this.mode) {
      case 'approvedDirect':
      case 'approvedTotal':
        this.calculateApprovedDirectAndTotal();
        break;
      default:
        this.logger.error('unknown mode "' + this.mode + '"');
    }
  }

  private calculateApprovedDirectAndTotal(): void {
    this.grantCosts = [];
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      if(req.applId === this.grant.applId) {
        req.financialInfoDto.fundingRequestCans.forEach(can => {
          this.grantCosts.push({
            applId: this.grant.applId,
            fseId: can.fseId,
            fundingSourceName: can.fundingSourceName,
            approvedDirect: can.approvedDc,
            approvedTotal: can.approvedTc
          });
        });
      }
    });
  }
}
