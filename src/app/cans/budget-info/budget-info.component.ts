import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CanManagementService } from '../can-management.service';
import { RequestModel } from '../../model/request/request-model';
import { CanCcxDto, FundingRequestCanDto } from '@cbiit/i2ecws-lib';
import { OefiaTypesComponent } from '../oefia-types/oefia-types.component';
import { CanSelectorComponent } from '../can-selector/can-selector.component';
import { ProjectedCanComponent } from '../projected-can/projected-can.component';
import { WorkflowModel } from '../../funding-request/workflow/workflow.model';
import { INITIAL_PAY_TYPES } from 'src/app/model/request/funding-request-types';
import { CanWarning } from 'src/app/funding-request/workflow/warning-modal/workflow-warning-modal.component';
import { CanSearchModalComponent } from '../can-search-modal/can-search-modal.component';
import { CustomServerLoggingService } from '../../logging/custom-server-logging-service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit {
  @ViewChild(CanSearchModalComponent) canSearchModalComponent: CanSearchModalComponent;

  @ViewChildren(OefiaTypesComponent) oefiaTypes: QueryList<OefiaTypesComponent>;
  @ViewChildren(CanSelectorComponent) canSelectors: QueryList<CanSelectorComponent>;
  @ViewChildren(ProjectedCanComponent) projectedCans: QueryList<ProjectedCanComponent>;

  @Input() readOnly = false;
  @Input() editing = false;
  showDirectCosts = false;
  sourceOrder: number[];

  defaultCanTracker: Map<number, boolean> = new Map<number, boolean>();

  initialPay: boolean;

  private requestNciFseIds: number[];
  isApprovalAction: boolean;

  get fundingRequestCans(): FundingRequestCanDto[] {
    return this.model.requestCans;
  }

  set fundingRequestCans(value: FundingRequestCanDto[]) {
    this.model.requestCans = value;
  }

  constructor(private logger: NGXLogger,
              private canManagementService: CanManagementService,
              public model: RequestModel,
              private workflowModel: WorkflowModel) {
  }

  ngOnInit(): void {
    this.initialPay = INITIAL_PAY_TYPES.includes(this.model.requestDto?.frtId);
    this.requestNciFseIds = this.model.programRecommendedCostsModel.fundingSources.filter(
      fs => (fs.nciSourceFlag === 'Y') &&
        this.model.programRecommendedCostsModel.selectedFundingSourceIds.has(fs.fundingSourceId)
    ).map(fs => fs.fundingSourceId);
    this.canManagementService.nonDefaultCanEventEmitter.subscribe(next => {
      if (+next.applId === -1) {
        this.defaultCanTracker.set(+next.fseId, next.nonDefault);
      }
    });
    this.canManagementService.initializeCANDisplayMatrixForRequest();
    this.model.requestCans.forEach(c => {
      if (c.approvedDc && +c.approvedDc > 0) {
        this.showDirectCosts = true;
      }
    });
    this.sourceOrder = this.model.programRecommendedCostsModel.selectedFundingSources.map(s => s.fundingSourceId);
    this.model.requestCans.sort((a, b) => {
      return this.sourceOrder.indexOf(a.fseId) - this.sourceOrder.indexOf(b.fseId);
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

  refreshRequestCans(): void {
    this.model.requestCans.forEach((c, index) => {
      this.logger.debug('can before', c);
      const selected: CanCcxDto = this.getCanSelectorWithIndex(index)?.selectedCanData;
      if (selected) {
        this.logger.debug(selected);
        c.can = selected.can;
        c.canDescription = selected.canDescrip;
      }
      const oefiaType = this.getOefiaTypeWithIndex(index)?.selectedValue;
      c.octId = c.oefiaTypeId = !isNaN(oefiaType) ? (Number(oefiaType) !== 0 ? Number(oefiaType) : null) : null;

      if (this.isFcNci()) {
        c.oefiaCreateCode = this.model.requestDto.oefiaCreateCode;
      }
      this.logger.debug('can after', c);
    });
  }

  getOefiaTypeWithIndex(index: number): OefiaTypesComponent {
    if(!this.oefiaTypes) {
      return null;
    }
    let result: OefiaTypesComponent;
    // @ts-ignore
    this.oefiaTypes.forEach(control => {
      if(+control.index === index) {
        result = control;
      }
    });
    return result;
  }

  getCanSelectorWithIndex(index: number): CanSelectorComponent {
    if(!this.canSelectors) {
      return null;
    }
    let result: CanSelectorComponent;
    // @ts-ignore
    this.canSelectors.forEach(control => {
      if(+control.index === +index) {
        result = control;
      }
    });
    return result;
  }

  copyProjectedCan(i: number): void {
    this.canSelectors.forEach((control) => {
      if (+i === +control.index) {
        control.selectProjectedCan();
      }
    });
  }

  nonDefaultCan(i: number): boolean {
    if (!this.canSelectors) {
      return false;
    }
    let fseId: number;
      this.canSelectors.forEach(control => {
        if(+control.index === +i) {
          fseId = control.fseId;
        }
      });

    return this.defaultCanTracker?.get(fseId) || false;
  }

  duplicateCan(i: number): boolean {
    if (!this.canSelectors) {
      return false;
    }
    const theirCANs: string[] = [];
    let myCAN: string;
    // const dupes: boolean[] = [false, false, false];

    this.canSelectors.forEach((control) => {
      if(control.index === i) {
        myCAN = !!control.selectedValue ? control.selectedValue : undefined;
      } else {
        if(!!control.selectedValue) {
          theirCANs.push(control.selectedValue);
        }
      }
    });

    return !!myCAN && theirCANs.includes(myCAN);
  }

  showCopyProjectedCan(i: number): boolean {
    if(!this.projectedCans) {
      return false;
    }

    let projectedCan: CanCcxDto;
    this.projectedCans.forEach(control => {
      if(+control.index === +i) {
        projectedCan = control.projectedCan;
      }
    });
    if (!projectedCan?.can || !projectedCan?.canDescrip) {
      return false;
    }

    return !!projectedCan;
  }

  isCanRequired(fseId: number): boolean {
    return this.isApprovalAction &&
      this.workflowModel.isFcNci &&
      this.requestNciFseIds.includes(fseId);
  }

  isFormValid(canWarning: CanWarning): boolean {
    const selectedCans: string[] = [];
    for (const canSelector of this.canSelectors) {
      this.logger.debug('CanSelector Validation index= ' + canSelector.index + ' can=' + canSelector.selectedValue);
      if (this.canEnter(canSelector.fseId) && !canSelector.selectedValue) {
        canWarning.missingCan = true;
      } else if (canSelector.selectedValue && this.isFcNci()) {
        for (const projectedCan of this.projectedCans) {
          if (projectedCan.projectedCan?.can &&
            canSelector.fseId === projectedCan.fseId &&
            canSelector.selectedValue !== projectedCan.projectedCan.can) {
            canWarning.nonDefaultCan = true;
          }
        }
        if (selectedCans.includes(canSelector.selectedValue)) {
          canWarning.duplicateCan = true;
        }
        selectedCans.push(canSelector.selectedValue);
      }
    }

    let valid = true;

    if (this.canSelectors) {
      for (const canSelector of this.canSelectors) {
        if (canSelector.canForm && !canSelector.canForm.form.valid) {
          valid = false;
        }
      }
    }
    return valid;
  }

  canSearchForCAN(fseId: number): boolean {
    return true;
  }

  searchForCANs(fseId: number, nciSourceFlag: string): void {
    this.canSearchModalComponent.nciSourceFlag = nciSourceFlag;
    this.canSearchModalComponent.bmmCodes = this.model.requestDto?.bmmCode;
    this.canSearchModalComponent.activityCodes = this.model.requestDto?.activityCode;
    this.canSearchModalComponent.prepare();
    this.canSearchModalComponent.open().then((result) => {
      if (result) {
        this.canManagementService.selectCANEmitter.next({ fseId, can: result, override: true });
      }
    }).catch((reason) => {
    });

  }

  /* Applicable for ARC and NCI financial approvers in edit mode; readonly display will be determined elsewhere */
  canSee(fseId: number): boolean {
    const displayMatrix = this.canManagementService.canDisplayMatrix.get(fseId);
    if (!displayMatrix) {
      this.logger.warn(`canSee(${fseId}) - no display matrix; return false`);
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
    // this.logger.debug(`can see at least one CAN: ${result}`);
    return result;
  }

  /* Applicable for ARC and NCI financial approvers in edit mode; readonly display will be determined elsewhere */
  canEnter(fseId: number): boolean {
    const displayMatrix = this.canManagementService.canDisplayMatrix?.get(fseId);
    if (!displayMatrix) {
      this.logger.warn(`canEnter(${fseId}) - no display matrix; return false`);
      return false;
    }
    // this.logger.debug(`isFcArc: ${this.isFcArc()} == ARC enters: ${displayMatrix.arcEnters === 'Y'}`);
    // this.logger.debug(`isFcNci: ${this.isFcNci()} == NCI enters: ${displayMatrix.oefiaEnters === 'Y'}`);

    if ((this.isFcArc() && displayMatrix.arcEnters === 'Y') || (this.isFcNci() && displayMatrix.oefiaEnters === 'Y')) {
      // this.logger.debug(`canEnter(${fseId}) :: true`);
      return true;
    }
    // this.logger.debug(`canEnter(${fseId}) :: false`);
    return false;
  }

  canEnterAtLeastOneCAN(): boolean {
    let result = false;
    for (const key of this.canManagementService.canDisplayMatrix.keys()) {
      if (this.canEnter(key)) {
        result = true;
      }
    }
    // this.logger.debug(`can enter at least one CAN: ${result}`);
    return result;
  }
}
