import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { CanCcxDto, FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CanSearchModalComponent } from '../../cans/can-search-modal/can-search-modal.component';
import { WorkflowModalComponent } from '../../funding-request/workflow-modal/workflow-modal.component';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit {
  @ViewChild(CanSearchModalComponent) canSearchModalComponent: CanSearchModalComponent;



  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();
  projectedApplIdCans: Map<number, Map<number, CanCcxDto>> = new Map<number, Map<number, CanCcxDto>>();

  constructor(
    private modalService: NgbModal,
    public planModel: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private canManagementService: CanManagementService) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.canManagementService.projectedCanEmitter.subscribe(next => {
      this.logger.debug('new projected CAN:', next);
      if (next.fseId) {
        this.projectedCans.set(next.fseId, next.can);
        if (next.applId) {
          const tmp = new Map<number, CanCcxDto>();
          tmp.set(next.applId, next.can);
          this.projectedApplIdCans.set(next.fseId, tmp);
        }
      }
    });
  }

  copyProjectedCAN(fundingSourceId: number): void {
    this.logger.debug('copyProjectedCAN(', fundingSourceId, ')');
    const can = this.projectedCans.get(Number(fundingSourceId));
    this.logger.debug('projectedCAN for source', fundingSourceId, '=', can);
    this.canManagementService.selectCANEmitter.next({ fseId: fundingSourceId, can });
  }

  searchForCANs(nciSourceFlag: string): void {
    this.logger.debug('searchForCANs()', nciSourceFlag);
    // TODO: set up modal with proper data
    this.canSearchModalComponent.title = `Search for CANs`;
    this.canSearchModalComponent.open();

  }

  deleteSelectedCAN(fundingSourceId: number): void {
    this.logger.debug('deleteSelectedCAN(', fundingSourceId, ')');
    this.canManagementService.selectCANEmitter.next({ fseId: fundingSourceId, can: null });

  }
}
