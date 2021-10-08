import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { CanCcxDto, FsRequestControllerService, FundingRequestCanDisplayDto } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CanSearchModalComponent } from '../../cans/can-search-modal/can-search-modal.component';
import { WorkflowModel } from '../../funding-request/workflow/workflow.model';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit, AfterViewInit {
  @ViewChild(CanSearchModalComponent) canSearchModalComponent: CanSearchModalComponent;

  @Input() readOnly = false;

  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();
  projectedApplIdCans: Map<string, CanCcxDto> = new Map<string, CanCcxDto>();


  constructor(
    private modalService: NgbModal,
    public planModel: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private canManagementService: CanManagementService,
    private workflowModel: WorkflowModel) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.canManagementService.projectedCanEmitter.subscribe(next => {
      // this.logger.debug('projected CAN:', next);
      if (next.fseId) {
        this.projectedCans.set(next.fseId, next.can);
        if (next.applId) {
          const key = String(next.fseId) + '-' + String(next.applId);
          this.projectedApplIdCans.set(key, next.can);
        }
      }
    });
    this.canManagementService.oefiaTypeEmitter.subscribe(next => {
      this.logger.debug('new OEFIA type chosen', next);
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingPlanFundsSources.forEach(source => {
        if (source.fundingSourceId === next.fseId) {
          source.octId = next.value;
          this.logger.debug('updated source: ', source);
        }
      });
    });

  }

  /* Applicable for ARC and NCI financial approvers in edit mode; readonly display will be determined elsewhere */
  canSee(fseId: number): boolean {
    const displayMatrix = this.canManagementService.canDisplayMatrix.get(fseId);
    if (!displayMatrix) {
      return false;
    }
    // this.logger.debug('ARC sees  : ', displayMatrix.arcSees);
    // this.logger.debug('OEFIA sees: ', displayMatrix.oefiaSees);
    if ((this.isFcArc() && displayMatrix.arcSees === 'Y') || (this.isFcNci() && displayMatrix.oefiaSees === 'Y')) {
      return true;
    }
    return false;
  }

  canSeeAtLeastOneCAN(): boolean {
    let result = false;
    for (const key of this.canManagementService.canDisplayMatrix.keys()) {
      if (this.canSee(key)) {
        result = true;
      }
    }
    return result;
  }

  /* Applicable for ARC and NCI financial approvers in edit mode; readonly display will be determined elsewhere */
  canEnter(fseId: number): boolean {
    const displayMatrix = this.canManagementService.canDisplayMatrix?.get(fseId);
    if (!displayMatrix) {
      return false;
    }
    // this.logger.debug('ARC enters  : ', displayMatrix.arcEnters);
    // this.logger.debug('OEFIA enters: ', displayMatrix.oefiaEnters);
    if ((this.isFcArc() && displayMatrix.arcEnters === 'Y') || (this.isFcNci() && displayMatrix.oefiaEnters === 'Y')) {
      return true;
    }
    return false;
  }

  canEnterAtLeastOneCAN(): boolean {
    this.logger.debug('user is ARC:', this.isFcArc());
    let result = false;
    for (const key of this.canManagementService.canDisplayMatrix.keys()) {
      if (this.canEnter(key)) {
        result = true;
      }
    }
    this.logger.debug('can enter at least one: ', result)
    return result;
  }

  copyProjectedCAN(fundingSourceId: number): void {
    const can = this.projectedCans.get(Number(fundingSourceId));
    this.canManagementService.selectCANEmitter.next({ fseId: fundingSourceId, can });
  }

  searchForCANs(fseId: number, nciSourceFlag: string): void {
    // TODO: set up modal with proper data
    this.canSearchModalComponent.title = `Search for CANs`;
    this.canSearchModalComponent.nciSourceFlag = nciSourceFlag;
    this.canSearchModalComponent.bmmCodes = this.planModel.bmmCodeList;
    this.canSearchModalComponent.activityCodes = this.planModel.activityCodeList;
    this.canSearchModalComponent.prepare();
    this.canSearchModalComponent.open().then((result) => {
      this.logger.debug('Got CAN', result);
      if (result) {
        this.canManagementService.selectCANEmitter.next({ fseId, can: result });
      }
    }).catch((reason) => {
      this.logger.warn(reason);
    });

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

  isApprovedFinancials(): boolean {
    return this.workflowModel.approvedByFC;
  }

  deleteSelectedCAN(fundingSourceId: number): void {
    this.canManagementService.selectCANEmitter.next({ fseId: fundingSourceId, can: null });

  }

  canCopyProjectedCan(fundingSourceId: number): boolean {
    if (!this.projectedCans.get(fundingSourceId)?.can || this.readOnly) {
      return false;
    }
    return true;
  }


  ngAfterViewInit(): void {
    this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      req.financialInfoDto.fundingRequestCans.forEach(can => {
        if (can.can) {
          this.canManagementService.getCanDetails(can.can).subscribe(result => {
            this.canManagementService.selectCANEmitter.next({ fseId: can.fseId, can: result, applId: req.applId });
          });
        }
      });
    });

  }

  canSearchForCAN(fundingSourceId: number): boolean {
    return this.canEnter(fundingSourceId) && !this.readOnly;
  }

  canDeleteCAN(fundingSourceId: number): boolean {
    return this.canEnter(fundingSourceId) && !this.readOnly;
  }
}
