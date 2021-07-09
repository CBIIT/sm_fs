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
import {NGXLogger} from 'ngx-logger';
import {CanManagementServiceBus} from '../can-management-service-bus.service';
import {RequestModel} from '../../model/request-model';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {CanCcxDto, FundingRequestCanDto} from '@nci-cbiit/i2ecws-lib';
import {OefiaTypesComponent} from '../oefia-types/oefia-types.component';
import {CanSelectorComponent} from '../can-selector/can-selector.component';

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit, AfterViewInit {

  @ViewChildren(OefiaTypesComponent) oefiaTypes: QueryList<OefiaTypesComponent>;
  @ViewChildren(CanSelectorComponent) canSelectors: QueryList<CanSelectorComponent>;
  fundingRequestCans: FundingRequestCanDto[];

  constructor(private logger: NGXLogger, private canService: CanManagementServiceBus, private model: RequestModel) {
  }

  ngOnInit(): void {
    this.logger.debug('Initialize');
    this.canService.getRequestCans(this.model.requestDto.frqId).subscribe(result => {
      this.setRequestCans(result);
    });
    this.canService.refreshCans();
    this.canService.refreshOefiaCodes();
    this.logger.debug(this.canService.defaultCans);
    this.logger.debug(this.canService.grantCans);
  }

  setRequestCans(cans: FundingRequestCanDto[]): void {
    this.fundingRequestCans = cans;
  }

  get defaultCans(): CanCcxDto[] {
    return this.canService.defaultCans;
  }

  get sources(): FundingRequestFundsSrcDto[] {
    return this.model.programRecommendedCostsModel.selectedFundingSources;
  }

  // TODO: this needs to come from funding request cans t
  approvedTotal(fundingSourceId: number): number {
    let total = 0;
    this.fundingRequestCans.forEach(c => {
      if (c.fseId === fundingSourceId) {
        total += Number(c.approvedTc);
      }
    });
    return total;
  }

  copyProjectedCan(i: number): void {
    this.logger.debug('copy projected can in row', i);
    this.canSelectors.forEach((control, index) => {
      if (i === index) {
        const result = control.selectProjectedCan();
        if (result) {
          this.logger.debug('Projected CAN copied in row', index);
        } else {
          this.logger.debug('No projected CAN in row', index, 'to copy');
        }
      }
    });
  }

  nonDefaultCan(i: number): boolean {
    // this.logger.debug('validate non-default CAN in row', i);
    return false;
  }

  duplicateCan(i: number): boolean {
    // this.logger.debug('validate duplicate CAN in row', i);
    return false;
  }

  ngAfterViewInit(): void {
    // this.logger.debug('afterViewInit()', this.oefiaTypes);
    // this.oefiaTypes.forEach((oefiaType, index) => {
    //
    //   oefiaType.selectedValueChange.subscribe(val => {
    //     this.logger.debug('OEFIA type:', val);
    //     this.oefiaTypeId[index] = Number(val);
    //   });
    // });
  }
}
