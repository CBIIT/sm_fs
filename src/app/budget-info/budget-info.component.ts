import {Component, Input, OnInit, Output, EventEmitter, ViewChild, AfterViewInit} from '@angular/core';
import {NGXLogger} from "ngx-logger";
import {CanManagementService} from "../service/can-management-service";
import {RequestModel} from "../model/request-model";
import {FundingRequestFundsSrcDto} from "@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto";
import {PrcDataPoint} from "../program-recommended-costs/prc-data-point";
import {CanCcxDto} from "@nci-cbiit/i2ecws-lib";
import {OefiaTypesComponent} from "../oefia-types/oefia-types.component";

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit, AfterViewInit {
  sources: FundingRequestFundsSrcDto[];
  @ViewChild(OefiaTypesComponent)  oefiaType: OefiaTypesComponent;
  oefiaTypeId: number;

  constructor(private logger: NGXLogger, private canService: CanManagementService, private model: RequestModel) {
    this.sources = model.programRecommendedCostsModel.selectedFundingSources;
    this.logger.debug(this.sources);
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
        total += Number(li.recommendedDirect);
      }
    });
    return total;
  }

  setOefiaType(i: number): void {

  }

  copyProjectedCan(i: number): void {
    //this.logger.debug('copy projected can in row', i);
  }

  nonDefaultCan(i: number): boolean {
    //this.logger.debug('validate non-default CAN in row', i);
    return false;
  }

  duplicateCan(i: number): boolean {
    //this.logger.debug('validate duplicate CAN in row', i);
    return false;
  }

  ngAfterViewInit(): void {
    this.logger.debug('afterViewInit()', this.oefiaType);
    this.oefiaType.selectedValueChange.subscribe(val => {
      this.logger.debug('OEFIA type:', val);
      this.oefiaTypeId = Number(val);
    });
  }
}
