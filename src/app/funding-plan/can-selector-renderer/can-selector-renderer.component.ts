import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { GrantCostPayload, PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { CanSearchModalComponent } from '../../cans/can-search-modal/can-search-modal.component';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-can-selector-renderer',
  templateUrl: './can-selector-renderer.component.html',
  styleUrls: ['./can-selector-renderer.component.css']
})
export class CanSelectorRendererComponent implements OnInit {
  @ViewChild(CanSearchModalComponent) canSearchModalComponent: CanSearchModalComponent;

  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();
  @Input() projectedApplIdCans: Map<number, Map<number, CanCcxDto>> = new Map<number, Map<number, CanCcxDto>>();

  constructor(
    private planManagementService: PlanManagementService,
    private canManagementService: CanManagementService,
    private planModel: PlanModel,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
  }

  get grantCosts(): GrantCostPayload[] {
    return this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
  }

  nonDefaultCAN(applId: number, fseId: number, index: number): void {

  }

  duplicateCAN(applId: number, fseId: number, index: number): void {

  }

  copyProjectedCAN(applId: number, fseId: number, index: number): void {
    const can = this.projectedApplIdCans?.get(fseId)?.get(applId);
    if (can) {
      this.canManagementService.selectCANEmitter.next({ fseId, can, applId });
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
        this.canManagementService.selectCANEmitter.next({ fseId, can: result, applId });
      }
    }).catch((reason) => {
      this.logger.warn(reason);
    });
  }

  deleteCAN(applId: number, fseId: number, index: number): void {
    this.canManagementService.selectCANEmitter.next({ fseId, can: null, applId });
  }

  canCopyProjectedCan(applId: number, fseId: number, index: number): boolean {
    return true;
  }

  canDeleteCAN(applId: number, fseId: number, index: number): boolean {
    return true;
  }
}
