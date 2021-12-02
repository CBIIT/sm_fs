import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementService } from '../can-management.service';
import { RequestModel } from '../../model/request/request-model';
import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { OefiaTypesComponent } from '../oefia-types/oefia-types.component';
import { CanSelectorComponent } from '../can-selector/can-selector.component';
import { ProjectedCanComponent } from '../projected-can/projected-can.component';
import { WorkflowModel } from '../../funding-request/workflow/workflow.model';
import { INITIAL_PAY_TYPES } from 'src/app/model/request/funding-request-types';
import { CanWarning } from 'src/app/funding-request/workflow/warning-modal/workflow-warning-modal.component';
import { CanSearchModalComponent } from '../can-search-modal/can-search-modal.component';

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
    this.logger.debug(this.canManagementService.canDisplayMatrix);
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
      const selected: CanCcxDto = this.canSelectors?.get(index)?.selectedCanData;
      if (selected) {
        c.can = selected.can;
        c.canDescription = selected.canDescrip;
      }
      const oefiaType = this.oefiaTypes?.get(index)?.selectedValue;
      c.octId = c.oefiaTypeId = !isNaN(oefiaType) ? (Number(oefiaType) !== 0 ? Number(oefiaType) : null) : null;
      this.logger.debug('fcNci: ', this.isFcNci(), this.model.requestDto.oefiaCreateCode);

      if (this.isFcNci()) {
        c.oefiaCreateCode = this.model.requestDto.oefiaCreateCode;
      }
      this.logger.debug('prepared CAN:', c);
    });
  }


  copyProjectedCan(i: number): void {
    this.canSelectors.forEach((control, index) => {
      if (i === index) {
        control.selectProjectedCan();
      }
    });
  }

  nonDefaultCan(i: number): boolean {
    if (!this.canSelectors) {
      return false;
    }
    const fseId: number = this.canSelectors?.get(i)?.fseId;

    return this.defaultCanTracker?.get(fseId) || false;
  }

  duplicateCan(i: number): boolean {
    if (!this.canSelectors) {
      return false;
    }
    const cans: string[] = [];
    const dupes: boolean[] = [false, false, false];
    this.canSelectors.forEach((control) => {
      cans.push(control.selectedValue || '');
    });
    cans.forEach((c1, i1) => {
      cans.forEach((c2, i2) => {
        if (i1 !== i2 && c1 !== '') {
          if (c1 === c2) {
            dupes[i1] = true;
          }
        }
      });
    });
    return dupes[i];
  }

  showCopyProjectedCan(i: number): boolean {
    const projectedCan: CanCcxDto = this.projectedCans?.get(i)?.projectedCan;
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
      if (!canSelector.selectedValue) {
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
    this.canSearchModalComponent.title = `Search for CANs`;
    this.canSearchModalComponent.nciSourceFlag = nciSourceFlag;
    this.canSearchModalComponent.bmmCodes = this.model.requestDto?.bmmCode;
    this.canSearchModalComponent.activityCodes = this.model.requestDto?.activityCode;
    this.canSearchModalComponent.prepare();
    this.canSearchModalComponent.open().then((result) => {
      if (result) {
        this.canManagementService.selectCANEmitter.next({ fseId, can: result });
      }
    }).catch((reason) => {
    });

  }

  /* Applicable for ARC and NCI financial approvers in edit mode; readonly display will be determined elsewhere */
  canSee(fseId: number): boolean {
    const displayMatrix = this.canManagementService.canDisplayMatrix.get(fseId);
    if (!displayMatrix) {
      this.logger.debug(`canSee(${fseId}) - no display matrix; return false`);
      return false;
    }
    // this.logger.debug(`isFcArc: ${this.isFcArc()} == ARC sees: ${displayMatrix.arcSees === 'Y'}`);
    // this.logger.debug(`isFcNci: ${this.isFcNci()} == NCI sees: ${displayMatrix.oefiaSees === 'Y'}`);
    if ((this.isFcArc() && displayMatrix.arcSees === 'Y') || (this.isFcNci() && displayMatrix.oefiaSees === 'Y')) {
      // this.logger.debug(`canSee(${fseId}) :: true`);
      return true;
    }
    // this.logger.debug(`canSee(${fseId}) :: false`);
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
      this.logger.debug(`canEnter(${fseId}) - no display matrix; return false`);
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
