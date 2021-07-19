import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList
} from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementServiceBus } from '../can-management-service-bus.service';
import { RequestModel } from '../../model/request/request-model';
import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { OefiaTypesComponent } from '../oefia-types/oefia-types.component';
import { CanSelectorComponent } from '../can-selector/can-selector.component';
import { ProjectedCanComponent } from '../projected-can/projected-can.component';

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

  get fundingRequestCans(): FundingRequestCanDto[] {
    return this.model.requestCans;
  }

  set fundingRequestCans(value: FundingRequestCanDto[]) {
    this.model.requestCans = value;
  }

  constructor(private logger: NGXLogger, private canService: CanManagementServiceBus, private model: RequestModel) {
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
    });
  }

  ngOnInit(): void {
  }

  copyProjectedCan(i: number): void {
    this.logger.debug('copy projected can in row', i);
    this.canSelectors.forEach((control, index) => {
      if (i === index) {
        const result = control.selectProjectedCan();
      }
    });
  }

  nonDefaultCan(i: number): boolean {
    if (!this.canSelectors || !this.projectedCans) {
      return false;
    }
    // this.logger.debug('validate non-default CAN in row', i);
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
}
