import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto, FundingRequestCanDisplayDto } from '@cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { CanSearchModalComponent } from '../../cans/can-search-modal/can-search-modal.component';
import { PlanModel } from '../../model/plan/plan-model';
import { WorkflowModel } from '../../funding-request/workflow/workflow.model';
import { FpCanWarning } from '../fp-workflow/fp-warning-modal/fp-workflow-warning-modal.component';
import { GrantCostPayload } from '../service/grant-cost-payload';


@Component({
  selector: 'app-can-selector-renderer',
  templateUrl: './can-selector-renderer.component.html',
  styleUrls: ['./can-selector-renderer.component.css']
})
export class CanSelectorRendererComponent implements OnInit, AfterViewInit {
  @ViewChild(CanSearchModalComponent) canSearchModalComponent: CanSearchModalComponent;

  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() g: GrantCostPayload;
  @Input() i: number
  @Input() projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();
  @Input() projectedApplIdCans: Map<string, CanCcxDto> = new Map<string, CanCcxDto>();
  @Input() readOnly = false;
  defaultCanTracker: Map<string, boolean> = new Map<string, boolean>();
  canRequiredButMissing: Map<number, boolean> = new Map<number, boolean>();
  approvingAction = false;

  fundingSources: number[];

  constructor(
    private planManagementService: PlanManagementService,
    private canManagementService: CanManagementService,
    private planModel: PlanModel,
    private workflowModel: WorkflowModel,
    private logger: NGXLogger) {
  }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    this.planManagementService.planBudgetReadOnlyEmitter.subscribe(next => {
      this.logger.debug('Plan budget read only:', next);
      this.readOnly = next;
    });
    this.fundingSources = this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.map(f => f.fundingSourceId);
    this.canManagementService.nonDefaultCanEventEmitter.subscribe(next => {
      // this.logger.debug(next);
      const key = String(next.fseId) + '-' + String(next.applId);
      this.defaultCanTracker.set(key, next.nonDefault);
      // stick validateCan here because this is called when can is set by search can modal.
      if (Number(next.applId) === this.grant?.applId) {
        this.validateCan();
      }
    });
  }

  get grantCosts(): GrantCostPayload[] {
    return this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
  }

  nonDefaultCAN(applId: number, fseId: number): boolean {
    const key = String(fseId) + '-' + String(applId);

    return this.defaultCanTracker?.get(key) || false;
  }

  duplicateCAN(applId: number, fseId: number, index: number): boolean {
    const key = String(fseId) + '-' + String(applId);
    const targetCAN = this.planModel.selectedApplIdCans?.get(key);
    let result = false;
    if (!targetCAN?.can) {
      return false;
    }

    this.fundingSources.forEach(sourceId => {
      if (Number(sourceId) !== Number(fseId)) {
        const key2 = String(sourceId) + '-' + String(applId);
        const can = this.planModel.selectedApplIdCans?.get(key2);
        if (!!can?.can) {
          result = can.can === targetCAN.can;
        }
      }
    });

    return result;

  }

  copyProjectedCAN(applId: number, fseId: number): void {
    const key = String(fseId) + '-' + String(applId);

    const can = this.projectedApplIdCans?.get(key);
    // this.logger.debug('copy projected can', applId, fseId, can);
    if (can) {
      this.canManagementService.selectCANEmitter.next({ fseId, can, applId, override: true });
    }

  }

  searchCAN(applId: number, fseId: number, nciSourceFlag: string): void {
    this.canSearchModalComponent.title = `Search for CANs`;
    this.canSearchModalComponent.nciSourceFlag = nciSourceFlag;
    this.canSearchModalComponent.bmmCodes = this.planModel.bmmCodeList;
    this.canSearchModalComponent.activityCodes = this.planModel.activityCodeList;
    this.canSearchModalComponent.prepare();
    this.canSearchModalComponent.open().then((result) => {
      this.logger.debug('Got CAN', result);

      if (result) {
        this.canManagementService.selectCANEmitter.next({ fseId, can: result, applId, override: true });
      }
    }).catch((reason) => {
      this.logger.warn(reason);
    });
  }

  deleteCAN(applId: number, fseId: number, index: number): void {
    this.canManagementService.selectCANEmitter.next({ fseId, can: null, applId, override: true });
  }

  canCopyProjectedCan(applId: number, fseId: number): boolean {
    const key = String(fseId) + '-' + String(applId);
    if (this.readOnly || !this.canEnter(fseId)) {
      return false;
    }

    if (!this.projectedApplIdCans?.get(key)?.can || this.readOnly) {
      return false;
      this.logger.debug('bad data =>', applId, fseId);
    }
    return true;
  }

  canDeleteCAN(applId: number, fseId: number): boolean {
    const key = String(fseId) + '-' + String(applId);
    const selectedCan = this.planModel.selectedApplIdCans.get(key);
    if (!selectedCan?.can || this.readOnly) {
      return false;
    }
    return true;
  }

  canSearchCan(applId: number, fseId: number): boolean {
    return this.canEnter(fseId) && !this.readOnly;
  }

  /* Applicable for ARC and NCI financial approvers in edit mode; readonly display will be determined elsewhere */
  canEnter(fseId: number): boolean {
    const displayMatrix = this.canManagementService.canDisplayMatrix?.get(fseId);
    if (!displayMatrix) {
      // this.logger.warn('no can matrix for fseId:', fseId);
      return false;
    }
    // this.logger.debug('ARC enters  : ', displayMatrix.arcEnters);
    // this.logger.debug('OEFIA enters: ', displayMatrix.oefiaEnters);
    if ((this.isFcArc() && displayMatrix.arcEnters === 'Y') || (this.isFcNci() && displayMatrix.oefiaEnters === 'Y')) {
      return true;
    }
    return false;
  }

  isFcArc(): boolean {
    return this.workflowModel.isFcArc;
  }

  isFcNci(): boolean {
    return this.workflowModel.isFcNci;
  }

  isFinancialApprover(): boolean {
    return this.workflowModel.isFinancialApprover;
  }

  validateCan(): void {
    this.canRequiredButMissing.clear();
    if (this.approvingAction && this.isFcNci()) {
      for (const g of this.grantCosts) {
        if (g.nciSourceFlag === 'Y' && g.requestedDirect > 0 && !this.planModel.getSelectedCan(g.fseId, g.applId)) {
          this.canRequiredButMissing.set(g.fseId, true);
        }
      }
    }
  }

  checkWarning(canWarning: FpCanWarning): void {
    const usedCan: string[] = [];
    for (const g of this.grantCosts) {
      // check for no default; only for NCI approver
      if (this.nonDefaultCAN(g.applId, g.fseId) && this.isFcNci()) {
        canWarning.nonDefaultCan = true;
      }
      const can = this.planModel.getSelectedCan(g.fseId, g.applId);
      // check for missing can, for both NCI and ARC approvers
      if (!can) {
        if (g.requestedDirect > 0 && this.canEnter(g.fseId)) {
          canWarning.missingCan = true;
        }
      }
      // check for duplicated cans; only for NCI approver
      else if (usedCan.includes(can.can) && this.isFcNci()) {
        canWarning.duplicateCan = true;
      } else {
        usedCan.push(can.can);
      }
    }
  }
}
