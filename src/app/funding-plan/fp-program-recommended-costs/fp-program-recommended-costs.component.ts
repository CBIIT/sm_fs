import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { isReallyANumber } from '../../utils/utils';

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
  @Input() lockDollar = false;
  @Input() required = true;
  baselineDirectCost: number;
  baselineTotalCost: number;
  directCost: number;
  totalCost: number;
  private _percentCut: number;
  directCostCalculated: number;
  totalCostCalculated: number;
  dcPercentCutCalculated: number;
  tcPercentCutCalculated: number;
  private _displayType: string;
  // Dummy ngModel attribute for hidden error fields
  dummy: string = null;
  private fseId: number;
  @Output() PendingPrcValuesEmitter = new EventEmitter<PendingPrcValues>();

  constructor(
    private planManagementService: PlanManagementService,
    private logger: NGXLogger) {
  }

  get percentCut(): number {
    return this._percentCut;
  }

  set percentCut(value: number) {
    this._percentCut = value;
    this.broadcastPendingValues();
  }

  set directCostDisplay(value: string) {
    this.directCost = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.directCost = Number(value);
      }
    }
    this.broadcastPendingValues();
  }

  get directCostDisplay(): string {
    if (this.directCost) {
      return this.directCost.toLocaleString();
    }
    return null;
  }

  set totalCostDisplay(value: string) {
    this.totalCost = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.totalCost = Number(value);
      }
    }
    this.broadcastPendingValues();
  }

  broadcastPendingValues(): void {
    const vals: PendingPrcValues = {
      applId: this.grant.applId,
      displayType: this._displayType,
      percentCut: this._percentCut,
      directCost: this.directCost,
      totalCost: this.totalCost,
    };
    this.PendingPrcValuesEmitter.next(vals);
  }

  get totalCostDisplay(): string {
    if (this.totalCost) {
      return this.totalCost.toLocaleString();
    }
    return null;
  }

  ngOnInit(): void {
    // TODO: get this from the grant?
    this.planManagementService.grantInfoCostEmitter.subscribe(next => {
      if (next.index === this.grantIndex) {
        this.baselineDirectCost = next.dc;
        this.baselineTotalCost = next.tc;
        this.initializeValuesForEdit();
      }
    });

    this.planManagementService.fundingSourceSelectionEmitter.subscribe(next => {
      if (next.index === this.sourceIndex) {
        this.fseId = next.source;
      }
    });

    if (!this.grant || this.sourceIndex === -1) {
      this.logger.warn('Eject - no grant or source index');
      return;
    }
    // Determine whether we should lock the dollar value or not
    if (this.planManagementService.isPercentSelected(this.grant.applId)) {
      if (+this.planManagementService.percentSelectionIndex(this.grant.applId) !== +this.sourceIndex) {
        this.lockDollar = true;
      }
    }
    // this.logger.warn('---------------------------------------------------------------------------------');
    // this.logger.debug('lockDollar:', this.grant.applId, this.sourceIndex, this.lockDollar);
    this.initializeValuesForEdit();
  }

  public initializeValuesForEdit(): void {
    if (this.sourceIndex < 0 || this.sourceIndex > 2) {
      return;
    }
    if (!this.fseId && !!this.planManagementService.listSelectedSources) {
      const src = this.planManagementService.listSelectedSources[this.sourceIndex];
      // this.logger.debug('source', src);
      if (src) {
        this.fseId = src.fundingSourceId;
      }
    }
    const bud = this.planManagementService.getBudget(this.grant.applId, this.fseId);
    const can = this.planManagementService.getCan(this.grant.applId, this.fseId);

    // TODO: this logic might need revisiting.
    // TODO: especially the determination of percent if lockDollar is true
    if (can && isReallyANumber(can.dcPctCut) && isReallyANumber(can.tcPctCut) && can.dcPctCut === can.tcPctCut) {
      // this.logger.debug(can);
      this._percentCut = can.dcPctCut;
      if (this.lockDollar) {
        this.logger.error('Control is locked to dollar only but analysis indicates percent');
      }
      this.displayType = 'percent';
    } else if (bud && isReallyANumber(bud.dcRecAmt) && isReallyANumber(bud.tcRecAmt)) {
      this.directCost = bud.dcRecAmt || null;
      this.totalCost = bud.tcRecAmt || null;
      this.displayType = 'dollar';
    }
    this.recalculate();
  }

  // NOTE: assuming they're entering percent cut as a whole number
  recalculate(): void {

    if (this._displayType === 'percent') {
      if (!!this._percentCut) {
        this.directCostCalculated = this.baselineDirectCost * (1 - (this._percentCut / 100));
        this.totalCostCalculated = this.baselineTotalCost * (1 - (this._percentCut / 100));
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
    return this._percentCut;
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
      return +this._percentCut;
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
      return +this._percentCut;
    }
    return +this.tcPercentCutCalculated;
  }

  get displayType(): string {
    return this._displayType;
  }

  set displayType(value: string) {
    if (value === 'percent') {
      this.planManagementService.setPercentSelected(this.grant.applId, this.sourceIndex, true);
    } else {
      this.planManagementService.setPercentSelected(this.grant.applId, this.sourceIndex, false);
    }
    this._displayType = value;
  }

}

export interface PendingPrcValues {
  applId: number;
  displayType: string;
  percentCut: number;
  directCost: number;
  totalCost: number;
}
