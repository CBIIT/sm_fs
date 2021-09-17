import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';

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
  private piDirect: number;
  private piTotal: number;
  private awardedDirect: number;
  private awardedTotal: number;

  constructor(
    private planModel: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService) {
  }

  ngOnInit(): void {
    this.calculateApprovedDirectAndTotal();
    this.calculateBaselines();
  }

  private calculateBaselines(): void {
    this.requestService.getApplPeriodsUsingGET(this.grant.applId).subscribe(result => {
      this.logger.debug('total results retrieved:', result?.length || 'none');
      if (result && result.length > 0) {
        this.piDirect = Number(result[0].requestAmount);
        this.piTotal = Number(result[0].requestTotalAmount);
        this.awardedTotal = Number(result[0].totalAwarded);
        this.awardedDirect = Number(result[0].directAmount);
      } else {
        this.logger.error('No grant awards found for applid', this.grant.applId);
        this.piDirect = 0;
        this.piTotal = 0;
        this.awardedDirect = 0;
        this.awardedTotal = 0;
      }
      // result.forEach(ga => {
      //   if (!isNaN(ga.requestAmount)) {
      //     this.piDirect += Number(ga.requestAmount);
      //   }
      //   if (!isNaN(ga.requestTotalAmount)) {
      //     this.piTotal += Number(ga.requestTotalAmount);
      //   }
      //   if (!isNaN(ga.totalAwarded)) {
      //     this.awardedTotal += Number(ga.totalAwarded);
      //   }
      //   if (!isNaN(ga.directAmount)) {
      //     this.awardedDirect += Number(ga.directAmount);
      //   }
      // });
    });

  }

  private calculateApprovedDirectAndTotal(): void {
    this.grantCosts = [];
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      if (req.applId === this.grant.applId) {
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
