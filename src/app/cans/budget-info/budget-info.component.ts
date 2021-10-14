import {
  Component,
  Input,
  OnInit,
  ViewChildren,
  QueryList,
  ViewChild
} from '@angular/core';
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
//  @ViewChild('canForm', {static: false}) canForm: NgForm;

  @Input() readOnly = false;
  @Input() editing = false;

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
              private canService: CanManagementService,
              public model: RequestModel,
              private workflowModel: WorkflowModel) {
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

  // TODO: evaluate for deletion
  get defaultCans(): CanCcxDto[] {
    return this.canService.defaultCans;
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
      c.oefiaCreateCode = this.model.requestDto.oefiaCreateCode;
      this.logger.debug('prepared CAN:', c);
    });
  }

  ngOnInit(): void {
    this.initialPay = INITIAL_PAY_TYPES.includes(this.model.requestDto?.frtId);
    this.requestNciFseIds = this.model.programRecommendedCostsModel.fundingSources.filter(
      fs => fs.nciSourceFlag &&
        this.model.programRecommendedCostsModel.selectedFundingSourceIds.has(fs.fundingSourceId)
    ).map(fs => fs.fundingSourceId);
    this.logger.debug('nci fsids ', this.requestNciFseIds);
  }

  copyProjectedCan(i: number): void {
    this.canSelectors.forEach((control, index) => {
      if (i === index) {
        control.selectProjectedCan();
      }
    });
  }

  nonDefaultCan(i: number): boolean {
    // TODO: this logic is wrong - we should be checking whether the CAN is one of the default CANs available.
    // See the logic implemented for Plans.
    if (!this.canSelectors || !this.projectedCans) {
      return false;
    }
    const selectedCan: CanCcxDto = this.canSelectors?.get(i)?.selectedCanData;
    const projectedCan: CanCcxDto = this.projectedCans?.get(i)?.projectedCan;
    if (!projectedCan || !projectedCan.can || !projectedCan.canDescrip) {
      return false;
    }
    if (!selectedCan || !selectedCan.can || !selectedCan.canDescrip) {
      return false;
    }
    return selectedCan.can !== projectedCan.can;
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
    for (let i = 0; i < this.fundingRequestCans.length; i++) {
      const can = this.fundingRequestCans[i];
//      this.logger.debug('FormValid can ', can);
      if (this.isFcNci() && !can.can) {
        canWarning.missingCan = true;
      }
      if (this.duplicateCan(i)) {
        canWarning.duplicateCan = true;
      }
      if (this.nonDefaultCan(i)) {
        canWarning.nonDefaultCan = true;
      }
    }

    let valid = true;

    if (this.canSelectors) {
      for (const canSelector of this.canSelectors) {
//        this.logger.debug('canForm ', canSelector.canForm);
        if (!canSelector.canForm.form.valid) {
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
    this.logger.debug(this.model.requestDto?.bmmCode);
    this.logger.debug(this.model.requestDto?.activityCode);
    // TODO: set up modal with proper data
    this.canSearchModalComponent.title = `Search for CANs`;
    this.canSearchModalComponent.nciSourceFlag = nciSourceFlag;
    this.canSearchModalComponent.bmmCodes = this.model.requestDto?.bmmCode;
    this.canSearchModalComponent.activityCodes = this.model.requestDto?.activityCode;
    this.canSearchModalComponent.prepare();
    this.canSearchModalComponent.open().then((result) => {
      if (result) {
        this.canService.selectCANEmitter.next({ fseId, can: result });
      }
    }).catch((reason) => {
      this.logger.warn(reason);
    });

  }
}
