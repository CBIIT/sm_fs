import { AfterViewInit, Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { CanCcxDto, FsRequestControllerService, FundingRequestCanDisplayDto } from '@cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CanSearchModalComponent } from '../../cans/can-search-modal/can-search-modal.component';
import { WorkflowModel } from '../../funding-request/workflow/workflow.model';
import { PlanManagementService } from '../service/plan-management.service';
import { FpCanWarning } from '../fp-workflow/fp-warning-modal/fp-workflow-warning-modal.component';
import { CanSelectorRendererComponent } from '../can-selector-renderer/can-selector-renderer.component';
import { VoidExpression } from 'typescript';
import { GrantCostPayload } from '../service/grant-cost-payload';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit, AfterViewInit {
  @ViewChild(CanSearchModalComponent) canSearchModalComponent: CanSearchModalComponent;
  @ViewChildren(CanSelectorRendererComponent) canSelectors: QueryList<CanSelectorRendererComponent>;
  @Input() readOnly = false;

  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();
  projectedApplIdCans: Map<string, CanCcxDto> = new Map<string, CanCcxDto>();

  constructor(
    private modalService: NgbModal,
    public planModel: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private planManagementService: PlanManagementService,
    private canManagementService: CanManagementService,
    private workflowModel: WorkflowModel) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.planManagementService.planBudgetReadOnlyEmitter.subscribe(next => {
      this.logger.debug('Plan budget read only:', next);

      this.readOnly = next;
    });

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
      this.planModel.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
        req.financialInfoDto.fundingRequestCans.forEach(can => {
          if (+can.fseId === +next.fseId) {
            can.oefiaTypeId = next.value;
          }
        });
      });
      this.planManagementService.grantCosts.forEach(gc => {
        if (+gc.fseId === +next.fseId) {
          gc.oefiaTypeId = next.value;
        }
      });
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
    if ((this.isFcArc() && displayMatrix.arcEnters === 'Y') || (this.isFcNci() && displayMatrix.oefiaEnters === 'Y')) {
      return true;
    }
    return false;
  }

  canEnterAtLeastOneCAN(): boolean {
    let result = false;
    for (const key of this.canManagementService.canDisplayMatrix?.keys()) {
      if (this.canEnter(key)) {
        result = true;
      }
    }
    return result;
  }

  copyProjectedCAN(fundingSourceId: number): void {
    const can = this.projectedCans.get(Number(fundingSourceId));
    this.canManagementService.selectCANEmitter.next({ fseId: fundingSourceId, can, override: false });
  }

  searchForCANs(fseId: number, nciSourceFlag: string): void {
    // TODO: set up modal with proper data
    this.canSearchModalComponent.nciSourceFlag = nciSourceFlag;
    this.canSearchModalComponent.bmmCodes = this.planModel.bmmCodeList;
    this.canSearchModalComponent.activityCodes = this.planModel.activityCodeList;
    this.canSearchModalComponent.prepare();
    this.canSearchModalComponent.open().then((result) => {
      this.logger.debug('Got CAN', result);
      if (result) {
        this.canManagementService.selectCANEmitter.next({ fseId, can: result, override: true });
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
    this.canManagementService.selectCANEmitter.next({ fseId: fundingSourceId, can: null, override: true });
    this.logger.debug(`can delete CAN(${fundingSourceId}) : ${this.canDeleteCAN(fundingSourceId)}`);

  }

  canCopyProjectedCan(fundingSourceId: number): boolean {
    if (!this.canEnter(fundingSourceId) || this.readOnly) {
      return false;
    }
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
            this.canManagementService.selectCANEmitter.next({
              fseId: can.fseId,
              can: result,
              applId: req.applId,
              override: true
            });
          });
        }
      });
    });

  }

  canSearchForCAN(fundingSourceId: number): boolean {
    return this.canEnter(fundingSourceId) && !this.readOnly;
  }

  canDeleteCAN(fundingSourceId: number): boolean {
    return !this.readOnly && this.canEnter(fundingSourceId) && this.planModel.isCanSelected(fundingSourceId);
  }

  showOefiaCoding(): boolean {
    if (this.readOnly) {
      return true;
    }
    if (this.isApprovedFinancials() /* && !((this.isFcArc() && this.canEnterAtLeastOneCAN()) || this.isFcNci()) */) {
      return true;
    }

    return false;
  }

  checkCanValidation(approvingAciton: boolean): void {
    for (const canSelector of this.canSelectors) {
      canSelector.approvingAction = approvingAciton;
      canSelector.validateCan();
    }
  }

  isFormValid(canWarning: FpCanWarning): boolean {
    let valid = true;
    for (const canSelector of this.canSelectors) {
      canSelector.checkWarning(canWarning);

      if (canSelector.canRequiredButMissing.size > 0) {
        valid = false;
      }
    }

    return valid;
  }

  getRowSpan(grant: NciPfrGrantQueryDtoEx): number {
    return this.planManagementService.grantCosts?.filter(g => g.applId === grant.applId).length || 1;
  }

  getGrantCosts(grant: NciPfrGrantQueryDtoEx): GrantCostPayload[] {
    return this.planManagementService.grantCosts.filter(g => g.applId === grant.applId);
  }
}
