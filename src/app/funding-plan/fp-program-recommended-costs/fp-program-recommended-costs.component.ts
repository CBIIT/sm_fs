import { Component, Input, OnInit } from '@angular/core';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';

@Component({
  selector: 'app-fp-program-recommended-costs',
  templateUrl: './fp-program-recommended-costs.component.html',
  styleUrls: ['./fp-program-recommended-costs.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FpProgramRecommendedCostsComponent implements OnInit {
  get displayType(): string {
    return this._displayType;
  }

  set displayType(value: string) {
    this.logger.debug('set displayType', value, this.grantIndex, this.sourceIndex);
    this._displayType = value;
  }

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
  private _displayType: string;
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
      this.logger.warn('Eject - no grant or source index');
      return;
    }
    this.initializeValuesForEdit();
  }

  private initializeValuesForEdit(): void {
    this.logger.debug('initialize PRC values', this.grantIndex, this.sourceIndex);
    if (this.sourceIndex < 0 || this.sourceIndex > 2) {
      return;
    }
    if (!this.fseId && !!this.planCoordinatorService.listSelectedSources) {
      this.logger.debug('load fseId from plan service');
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

    // TODO: this logic might need revisiting.
    if (can && !isNaN(can.dcPctCut) && !isNaN(can.tcPctCut) && can.dcPctCut === can.tcPctCut) {
      this.percentCut = can.dcPctCut;
      this.displayType = 'percent';
      // this.toggleDisplay('percent', this.grantIndex, this.sourceIndex);
      this.logger.debug('setting display to "percent" with value', this.percentCut);
    } else if (bud) {
      this.directCost = bud.dcRecAmt;
      this.totalCost = bud.tcRecAmt;
      this.displayType = 'dollar';
      // this.toggleDisplay('dollar', this.grantIndex, this.sourceIndex);
      this.logger.debug('setting display to "dollar"');
    }
    this.recalculate();
  }

  toggleDisplay(value: string, grantIndex: number, sourceIndex: number): void {
    // if (!value || this.grantIndex !== grantIndex || this.sourceIndex !== sourceIndex) {
    //   return;
    // }
    // this.logger.debug('toggle display', value, this.grantIndex, this.sourceIndex);
    // this._displayType = value;
  }

  // NOTE: assuming they're entering percent cut as a whole number
  recalculate(): void {

    if (this._displayType === 'percent') {
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
    if (this._displayType === 'percent') {
      return +this.directCostCalculated;
    } else {
      return +this.directCost;
    }
  }

  getDirectCostPercentCut(): number {
    if (this._displayType === 'percent') {
      return +this.percentCut;
    }
    return +this.dcPercentCutCalculated;
  }

  getTotalCost(): number {
    if (this._displayType === 'percent') {
      return +this.totalCostCalculated;
    } else {
      return +this.totalCost;
    }
  }

  getTotalCostPercentCut(): number {
    if (this._displayType === 'percent') {
      return +this.percentCut;
    }
    return +this.tcPercentCutCalculated;
  }

  set snapShot(data: PRCPayload) {
    // TODO: do something with applId and fseId?
    this.baselineTotalCost = data.baselineTotalCost;
    this.baselineDirectCost = data.baselineDirectCost;
    this.totalCost = data.totalCost;
    this.totalCostCalculated = data.totalCostCalculated;
    this.tcPercentCutCalculated = data.tcPercentCutCalculated;
    this.displayType = data.displayType;
    this.dcPercentCutCalculated = data.dcPercentCutCalculated;
    this.directCost = data.directCost;
    this.directCostCalculated = data.directCostCalculated;
    this.percentCut = data.percentCut;

    this.recalculate();
  }

  get snapShot(): PRCPayload {
    return {
      applId: this.grant.applId,
      fseId: this.fseId,
      baselineDirectCost: this.baselineDirectCost,
      baselineTotalCost: this.baselineTotalCost,
      dcPercentCutCalculated: this.dcPercentCutCalculated,
      directCost: this.directCost,
      directCostCalculated: this.directCostCalculated,
      displayType: this.displayType,
      percentCut: this.percentCut,
      tcPercentCutCalculated: this.tcPercentCutCalculated,
      totalCost: this.totalCost,
      totalCostCalculated: this.totalCostCalculated
    };
  }
}

export interface PRCPayload {
  applId: number;
  fseId: number;
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
}
