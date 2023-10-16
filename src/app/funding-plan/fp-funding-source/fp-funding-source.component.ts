import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { FsPlanControllerService } from '@cbiit/i2efsws-lib';
import { PlanManagementService } from '../service/plan-management.service';
import { PlanModel } from '../../model/plan/plan-model';
import { getCurrentFiscalYear } from '../../utils/utils';
import { FundingRequestFundsSrcDto } from '@cbiit/i2efsws-lib/model/fundingRequestFundsSrcDto';
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
  @Input() required = false;
  @Output() sourceChangedEvent = new EventEmitter<{ oldSource: number, newSource: number, newName: string }>();
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
    const oldValue = this._selectedValue;
    this._selectedValue = value;
    // this.logger.debug('--', oldValue, value, '--');
    if (oldValue && +value !== +oldValue) {
      this.logger.debug(`source changed: ${oldValue} to ${value}`);
      this.sourceChangedEvent.next({ oldSource: +oldValue, newSource: +value, newName: this.fundingSourceDetailsMap.get(+value)?.fundingSourceName });
    }
    // this.logger.debug('sending new selection');
    this.planCoordinatorService.fundingSourceSelectionEmitter.next({
      index: this.index,
      source: Number(value)
    });
    // this.logger.debug('tracking source', value, 'at index', this.index);
    this.planCoordinatorService.trackRestrictedSources(this.index, value);
  }

  sourceDetails(): FundingRequestFundsSrcDto {
    if (this._selectedValue) {
      return this.fundingSourceDetailsMap.get(Number(this._selectedValue));
    }
    return null;
  }

  ngOnInit(): void {
    // TODO: validate that pd and ca exist
    const pd = this.planCoordinatorService.selectedPd || null;
    const ca = this.planCoordinatorService.selectedCa || null;
    this.init(pd, ca);
  }

  public init(pd: number, ca: string): void {
    this.allRfaPaNumbers = [];
    this.fy = this.planModel.fundingPlanDto.planFy || getCurrentFiscalYear();
    this.planModel.grantsSearchCriteria.forEach(r => {
      this.allRfaPaNumbers.push(r.rfaPaNumber);
    });
    this.rfaPaNumber = this.allRfaPaNumbers[0];
    this.planCoordinatorService.fundingSourceValuesEmitter.subscribe(next => {
      this.logger.info(`funding source values changed ${next.pd} - ${next.ca}`);
      this.refreshSources(next.pd, next.ca);
    });

    if (this.planCoordinatorService.listSelectedSources) {
      const src = this.planCoordinatorService.listSelectedSources[this.index];

      if (src) {
        this.selectedValue = Number(src.fundingSourceId);
      }
    }
    if (pd && ca) {
      this.refreshSources(pd, ca);
    }
  }

  private refreshSources(pd: number, ca: string): void {
    if (!pd || !ca || !this.rfaPaNumber) {
      return;
    }
    const tmp: Select2OptionData[] = [];
    this.planControllerService.getFundingPlanFundingSources(this.rfaPaNumber, pd, ca, this.fy).subscribe(result => {
      this.planCoordinatorService.fundingSourceListEmitter.next(result);
      this.fundingSourceDetailsMap = new Map(result.map(item => [item.fundingSourceId, item]));
      result.forEach(s => {
        tmp.push({ id: String(s.fundingSourceId), text: s.fundingSourceName });
      });
      this.allSources = tmp;
      this.data = this.allSources.filter(x => !this.planCoordinatorService.getRestrictedSources(this.index).includes(Number(x.id)) /* && +x.id !== this.selectedValue */);
    });
  }
}
