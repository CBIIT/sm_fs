import {Component, OnInit} from '@angular/core';
import {NGXLogger} from "ngx-logger";
import {CanManagementService} from "../service/can-management-service";
import {RequestModel} from "../model/request-model";
import {FundingRequestFundsSrcDto} from "@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto";
import {PrcDataPoint} from "../program-recommended-costs/prc-data-point";

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit {
  sources: FundingRequestFundsSrcDto[];
  oefiaTypeId: number;


  constructor(private logger: NGXLogger, private canService: CanManagementService, private model: RequestModel) {
    this.sources = model.programRecommendedCostsModel.selectedFundingSources;
  }

  ngOnInit(): void {
    this.logger.debug('Initialize');
    this.canService.refreshCans();
    this.canService.refreshOefiaCodes();
    this.logger.debug(this.canService.defaultCans);
    this.logger.debug(this.canService.grantCans);
  }

  get defaultCans() {
    return this.canService.defaultCans;
  }

  approvedTotal(fundingSourceId: number): number {
    let total = 0;
    let p: PrcDataPoint[] = this.model.programRecommendedCostsModel.getLineItemsForSourceId(Number(fundingSourceId));
    p.forEach(li => {
      if (!isNaN(li.recommendedDirect)) {
        total += li.recommendedDirect;
      }
    });
    return total;
  }

  setOefiaType(oefiaType: number, i: number): void {
    this.logger.debug('setOefiaType:', oefiaType, 'in row', i);
  }

  copyProjectedCan(i: number): void {
    this.logger.debug('copy projected can in row', i);
  }

  nonDefaultCan(i: number): boolean {
    this.logger.debug('validate non-default CAN in row', i);
    return false;
  }

  duplicateCan(i: number): boolean {
    this.logger.debug('validate duplicate CAN in row', i);
    return false;
  }
}
