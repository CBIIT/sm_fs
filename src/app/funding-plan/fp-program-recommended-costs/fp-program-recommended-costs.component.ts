import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { isNumeric } from '../../utils/utils';
import { CanManagementService } from '../../cans/can-management.service';

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
  budgetId: number;
  canId: number;
  canDescription: string;
  canPhsOrgCode: string;
  can: string;
  pendingValues: PendingPrcValues;

  constructor(
    private planManagementService: PlanManagementService,
    private canManagementService: CanManagementService,
    private logger: NGXLogger) {
  }

  get percentCut(): number {
    return null || this._percentCut;
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
    this.pendingValues = vals;
    this.PendingPrcValuesEmitter.next(vals);
    this.planManagementService.addPendingValues(vals);
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
    this.budgetId = bud?.id;
    const can = this.planManagementService.getCan(this.grant.applId, this.fseId);
    this.canId = can?.id;
    this.canDescription = can?.canDescription;
    this.canPhsOrgCode = can?.phsOrgCode;
    this.can = can?.can;

    // Determine whether we should lock the dollar value or not
    if (this.planManagementService.isPercentSelected(this.grant.applId)) {
      const p = this.planManagementService.percentSelectionIndex(this.grant.applId);
      this.logger.debug(`${JSON.stringify(p)} -- ${this.sourceIndex} -- ${this.fseId}`)
      if (+p.fseId !== +this.fseId) {
        this.logger.debug('locking dollar');
        this.lockDollar = true;
      }
    }

    // TODO: this logic might need revisiting.
    // TODO: especially the determination of percent if lockDollar is true
    if (this.canManagementService.isCanPercentSelected(can)) {
      // this.logger.debug(can);
      this._percentCut = can.dcPctCut / 1000;
      if (this.lockDollar) {
        this.logger.error(`Control is locked to dollar only but analysis indicates percent: ${JSON.stringify(can)}`);
        if (can.percentSelected) {
          this.logger.error(`CAN percent selected: unlocking dollar [${can.fundingSourceName}]`);
          this.lockDollar = false;
        }
      }
      this.displayType = 'percent';
      if (+this._percentCut === 0) {
        this.directCostCalculated = bud.dcRecAmt;
        this.totalCostCalculated = bud.tcRecAmt;
      }
    } else if (bud && isNumeric(bud.dcRecAmt) && isNumeric(bud.tcRecAmt)) {
      this.directCost = bud.dcRecAmt || null;
      this.totalCost = bud.tcRecAmt || null;
      this.displayType = 'dollar';
    }
    this.recalculate();
  }

  // NOTE: assuming they're entering percent cut as a whole number
  recalculate(): void {

    if (this._displayType === 'percent') {
      if (!!this._percentCut || +this._percentCut === 0) {
        this.directCostCalculated = Math.round(this.baselineDirectCost * (1 - (this._percentCut / 100)));
        this.totalCostCalculated = Math.round(this.baselineTotalCost * (1 - (this._percentCut / 100)));
        if (+this._percentCut === 0) {
          this.directCost = this.directCostCalculated;
          this.totalCost = this.totalCostCalculated;
        }
      } else {
        this.directCostCalculated = null;
        this.totalCostCalculated = null;
      }
    } else {
      if (!!this.directCost) {
        this.dcPercentCutCalculated = (this.baselineDirectCost - this.directCost) / this.baselineDirectCost;
      } else {
        this.dcPercentCutCalculated = null;
      }

      if (!!this.totalCost) {
        this.tcPercentCutCalculated = (this.baselineTotalCost - this.totalCost) / this.baselineTotalCost;
      } else {
        this.tcPercentCutCalculated = null;
      }
    }

  }

  uniqueId(prefix: string): string {
    return prefix + String(this.grantIndex);
  }

  isDirectCostNumeric(): boolean {
    const period: boolean = String(this.getDirectCost()).indexOf('.') !== -1;
    return !period && !isNaN(this.getDirectCost());
  }

  isTotalCostNumeric(): boolean {
    const period: boolean = String(this.getTotalCost()).indexOf('.') !== -1;
    return !period && !isNaN(this.getTotalCost());
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

  isPercentValid(): boolean {
    const reg = /^\d{0,3}(\.\d{1,2})?$/;
    return reg.test(String(this.getPercentCut()));
  }

  getPercentCut(): number {
    return this._percentCut;
  }

  getDirectCost(): number {
    if (this._displayType === 'percent') {
      if (+this._percentCut === 0) {
        return +this.directCost;
      }
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
      if (+this._percentCut === 0) {
        return +this.totalCost;
      }
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
    this._displayType = value;
  }

  percentCutInRange(): boolean {
    return this.isPercentValid() && this.getPercentCut() <= 100;
  }
}

export interface PendingPrcValues {
  applId: number;
  displayType: string;
  percentCut: number;
  directCost: number;
  totalCost: number;
}
