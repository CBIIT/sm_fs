import { Component, Input, OnInit } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { FsPlanControllerService } from '@nci-cbiit/i2ecws-lib';
import { PlanManagementService } from '../service/plan-management.service';
import { PlanModel } from '../../model/plan/plan-model';
import { getCurrentFiscalYear } from '../../utils/utils';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { ControlContainer, NgForm } from '@angular/forms';

@Component({
  selector: 'app-fp-funding-source',
  templateUrl: './fp-funding-source.component.html',
  styleUrls: ['./fp-funding-source.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FpFundingSourceComponent implements OnInit {

  @Input() parentForm: NgForm;
  @Input() index: number;
  dummy: string = null;
  data: Select2OptionData[] = [];
  allSources: Select2OptionData[] = [];
  private _selectedValue: number = null;
  fy: number;
  rfaPaNumber: string;
  allRfaPaNumbers: string[];
  fundingSourceDetailsMap: Map<number, FundingRequestFundsSrcDto>;

  constructor(private logger: NGXLogger,
              private planControllerService: FsPlanControllerService,
              private planCoordinatorService: PlanManagementService,
              private planModel: PlanModel) {
  }


  get selectedValue(): number {
    return this._selectedValue;
  }

  set selectedValue(value: number) {
    if (this.index === -1) {
      return;
    }
    this._selectedValue = value;
    this.planCoordinatorService.fundingSourceSelectionEmitter.next({
      index: this.index,
      source: Number(value)
    });
    this.planCoordinatorService.trackSelectedSources(this.index, value);
  }

  sourceDetails(): FundingRequestFundsSrcDto {
    if (this._selectedValue) {
      return this.fundingSourceDetailsMap.get(Number(this._selectedValue));
    }
    return null;
  }

  ngOnInit(): void {
    this.logger.debug('initialize ', this.index);
    this.allRfaPaNumbers = [];
    this.fy = this.planModel.fundingPlanDto.planFy || getCurrentFiscalYear();
    this.planModel.grantsSearchCriteria.forEach(r => {
      this.allRfaPaNumbers.push(r.rfaPaNumber);
    });
    this.rfaPaNumber = this.allRfaPaNumbers[0];
    this.planCoordinatorService.fundingSourceValuesEmitter.subscribe(next => {
      this.refreshSources(next.pd, next.ca);
    });

    if (this.planCoordinatorService.listSelectedSources) {
      const src = this.planCoordinatorService.listSelectedSources[this.index];

      this.logger.debug('initial source', this.index, src);
      if (src) {
        this.selectedValue = Number(src.fundingSourceId);
      }
    }
  }

  private refreshSources(pd: number, ca: string): void {
    if (!pd || !ca) {
      return;
    }
    if (!this.rfaPaNumber) {
      this.logger.info('No rfaPaNumber available. Not refreshing sources');
      // tslint:disable-next-line:no-console
      // console.trace('missing rfaPaNumber');
      return;
    }
    const tmp: Select2OptionData[] = [];
    this.planControllerService.getFundingPlanFundingSourcesUsingGET(ca, this.fy, pd, this.rfaPaNumber).subscribe(result => {
      this.fundingSourceDetailsMap = new Map(result.map(item => [item.fundingSourceId, item]));
      result.forEach(s => {
        tmp.push({ id: String(s.fundingSourceId), text: s.fundingSourceName });
      });
      this.allSources = tmp;
      this.filterData();
    });
  }

  filterData(): void {
    this.data = this.allSources.filter(x => !this.planCoordinatorService.getRestrictedSources(this.index).includes(Number(x.id)));
  }
}
