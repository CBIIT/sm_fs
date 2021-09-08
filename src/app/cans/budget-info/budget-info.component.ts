import {
  Component,
  Input,
  OnInit,
  ViewChildren,
  QueryList
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

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit {

  @ViewChildren(OefiaTypesComponent) oefiaTypes: QueryList<OefiaTypesComponent>;
  @ViewChildren(CanSelectorComponent) canSelectors: QueryList<CanSelectorComponent>;
  @ViewChildren(ProjectedCanComponent) projectedCans: QueryList<ProjectedCanComponent>;

  @Input() readOnly = false;
  @Input() editing = false;

  initialPay: boolean;

  get fundingRequestCans(): FundingRequestCanDto[] {
    return this.model.requestCans;
  }

  set fundingRequestCans(value: FundingRequestCanDto[]) {
    this.model.requestCans = value;
  }

  constructor(private logger: NGXLogger, private canService: CanManagementService, public model: RequestModel,
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
  }

  copyProjectedCan(i: number): void {
    this.canSelectors.forEach((control, index) => {
      if (i === index) {
        control.selectProjectedCan();
      }
    });
  }

  nonDefaultCan(i: number): boolean {
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
}
