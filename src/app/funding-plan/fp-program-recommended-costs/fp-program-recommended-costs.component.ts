import { Component, Input, OnInit } from '@angular/core';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';

@Component({
  selector: 'app-fp-program-recommended-costs',
  templateUrl: './fp-program-recommended-costs.component.html',
  styleUrls: ['./fp-program-recommended-costs.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FpProgramRecommendedCostsComponent implements OnInit {
  @Input() grantIndex: number;
  @Input() sourceIndex: number;
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() parentForm: NgForm;
  baselineDirectCost: number;
  baselineTotalCost: number;
  directCost: number;
  totalCost: number;
  percentCut: number;
  directCostCalculated: number;
  totalCostCalculated: number;
  dcPercentCutCalculated: number;
  tcPercentCutCalculated: number;
  displayType: string;
  // Dummy ngModel attribute for hidden error fields
  dummy: string = null;
  private fseId: number;

  constructor(
    private planCoordinatorService: PlanManagementService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    // TODO: get this from the grant?
    this.planCoordinatorService.grantInfoCostEmitter.subscribe(next => {
      if (next.index === this.grantIndex) {
        this.baselineDirectCost = next.dc;
        this.baselineTotalCost = next.tc;
        this.initializeValuesForEdit();
      }
    });

    this.planCoordinatorService.fundingSourceSelectionEmitter.subscribe(next => {
      if (next.index === this.sourceIndex) {
        this.fseId = next.source;
      }
    });

    if (!this.grant || this.sourceIndex === -1) {
      return;
    }
    this.initializeValuesForEdit();
  }

  private initializeValuesForEdit(): void {
    this.logger.debug('grant', this.grantIndex, this.grant);
    if (!this.fseId && !!this.planCoordinatorService.listSelectedSources) {
      const src = this.planCoordinatorService.listSelectedSources[this.sourceIndex];
      if (src) {
        this.fseId = src.fundingSourceId;
      }
    }
    const bud = this.planCoordinatorService.getBudget(this.grant.applId, this.fseId);
    const can = this.planCoordinatorService.getCan(this.grant.applId, this.fseId);
    this.logger.debug('source', this.sourceIndex, this.fseId, this.planCoordinatorService.listSelectedSources[this.sourceIndex]);
    this.logger.debug('budget', bud);
    this.logger.debug('can', can);

    if (can && !isNaN(can.dcPctCut)) {
      this.percentCut = can.dcPctCut;
      this.displayType = 'percent';
    } else if (bud) {
      this.directCost = bud.dcRecAmt;
      this.totalCost = bud.tcRecAmt;
      this.displayType = 'dollar';
    }
    this.recalculate();
  }

  toggleDisplay(value: string): void {
    this.displayType = value;
  }

  // NOTE: assuming they're entering percent cut as a whole number
  recalculate(): void {

    if (this.displayType === 'percent') {
      if (!!this.percentCut) {
        this.directCostCalculated = this.baselineDirectCost * (1 - (this.percentCut / 100));
        this.totalCostCalculated = this.baselineTotalCost * (1 - (this.percentCut / 100));
      }
    } else {
      if (!!this.directCost) {
        this.dcPercentCutCalculated = (this.baselineDirectCost - this.directCost) / this.baselineDirectCost;
      }

      if (!!this.totalCost) {
        this.tcPercentCutCalculated = (this.baselineTotalCost - this.totalCost) / this.baselineTotalCost;
      }
    }

  }

  uniqueId(prefix: string): string {
    return prefix + String(this.grantIndex);
  }

  isDirectCostNumeric(): boolean {
    return !isNaN(this.getDirectCost());
  }

  isTotalCostNumeric(): boolean {
    return !isNaN(this.getTotalCost());
  }

  isDirectCostInRange(): boolean {
    if (this.isDirectCostNumeric()) {
      const d = this.getDirectCost();
      return d >= 0 && d <= 999999999;
    }
    return false;
  }

  isTotalCostInRange(): boolean {
    if (this.isTotalCostNumeric()) {
      const d = this.getTotalCost();
      return d >= 0 && d <= 999999999;
    }
    return false;
  }

  isTotalGreaterThanDirect(): boolean {
    return this.isTotalCostNumeric() && this.isDirectCostNumeric() && this.getDirectCost() <= this.getTotalCost();
  }

  isPercentNumeric(): boolean {
    return !isNaN(this.getPercentCut());
  }

  isPercentInRange(): boolean {
    if (this.isPercentNumeric()) {
      const p = this.getPercentCut();
      return p >= 0 && p <= 100;
    }
    return false;
  }

  isPercentValid(): boolean {
    return this.isPercentInRange();
  }

  getPercentCut(): number {
    return this.percentCut;
  }

  getDirectCost(): number {
    if (this.displayType === 'percent') {
      return this.directCostCalculated;
    } else {
      return this.directCost;
    }
  }

  getDirectCostPercentCut(): number {
    if (this.displayType === 'percent') {
      return this.percentCut;
    }
    return this.dcPercentCutCalculated;
  }

  getTotalCost(): number {
    if (this.displayType === 'percent') {
      return this.totalCostCalculated;
    } else {
      return this.totalCost;
    }
  }

  getTotalCostPercentCut(): number {
    if (this.displayType === 'percent') {
      return this.percentCut;
    }
    return this.tcPercentCutCalculated;
  }
}
