import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  ViewChildren,
  QueryList, Query
} from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementServiceBus } from '../can-management-service-bus.service';
import { RequestModel } from '../../model/request/request-model';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { OefiaTypesComponent } from '../oefia-types/oefia-types.component';
import { CanSelectorComponent } from '../can-selector/can-selector.component';
import { ProjectedCanComponent } from '../projected-can/projected-can.component';

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit, AfterViewInit {

  @ViewChildren(OefiaTypesComponent) oefiaTypes: QueryList<OefiaTypesComponent>;
  @ViewChildren(CanSelectorComponent) canSelectors: QueryList<CanSelectorComponent>;
  @ViewChildren(ProjectedCanComponent) projectedCans: QueryList<ProjectedCanComponent>;

  @Input() readOnly = false;

  private _fundingRequestCans: FundingRequestCanDto[];

  get fundingRequestCans(): FundingRequestCanDto[] {
    return this._fundingRequestCans;
  }

  set fundingRequestCans(value: FundingRequestCanDto[]) {
    this._fundingRequestCans = value;
    this.restoreCanData();
  }

  constructor(private logger: NGXLogger, private canService: CanManagementServiceBus, private model: RequestModel) {
  }

  get defaultCans(): CanCcxDto[] {
    return this.canService.defaultCans;
  }

  get sources(): FundingRequestFundsSrcDto[] {
    return this.model.programRecommendedCostsModel.selectedFundingSources;
  }

  restoreCanData(): void {
    this.logger.debug('restoring CAN data', this._fundingRequestCans);
    this._fundingRequestCans.forEach((can, index) => {
      this.oefiaTypes.get(index).selectedValue = can.octId || can.defaultOefiaTypeId;
      this.canSelectors.get(index).selectedCan = can.can;
    });
  }

  getRequestCans(): FundingRequestCanDto[] {
    this._fundingRequestCans.forEach((c, index) => {
      const selected: CanCcxDto = this.canSelectors?.get(index)?.selectedCanData;
      if (selected) {
        c.can = selected.can;
        c.canDescription = selected.canDescrip;
      }
      const oefiaType = this.oefiaTypes?.get(index)?.selectedValue;
      c.octId = oefiaType;
    });
    return this._fundingRequestCans;
  }

  ngOnInit(): void {
    this.canService.getRequestCans(this.model.requestDto.frqId).subscribe(result => {
      this.fundingRequestCans = result;
    });
    this.canService.refreshCans();
    this.canService.refreshOefiaCodes();
  }

  setRequestCans(cans: FundingRequestCanDto[]): void {

  }

  // TODO: this needs to come from funding request cans t
  approvedTotal(fundingSourceId: number): number {
    let total = 0;
    if (this._fundingRequestCans) {
      this._fundingRequestCans.forEach(c => {
        if (c.fseId === fundingSourceId) {
          total += Number(c.approvedTc);
        }
      });
    }
    return total;
  }

  copyProjectedCan(i: number): void {
    this.logger.debug('copy projected can in row', i);
    this.canSelectors.forEach((control, index) => {
      if (i === index) {
        const result = control.selectProjectedCan();
        // if (result) {
        //   this.logger.debug('Projected CAN copied in row', index);
        // } else {
        //   this.logger.debug('No projected CAN in row', index, 'to copy');
        // }
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
      cans.push(control.selectedCan || '');
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

  ngAfterViewInit(): void {

  }
}
