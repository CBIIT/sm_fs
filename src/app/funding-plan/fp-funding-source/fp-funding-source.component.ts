import { Component, OnInit } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { FsPlanControllerService } from '@nci-cbiit/i2ecws-lib';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { PlanModel } from '../../model/plan/plan-model';
import { getCurrentFiscalYear } from '../../utils/utils';

@Component({
  selector: 'app-fp-funding-source',
  templateUrl: './fp-funding-source.component.html',
  styleUrls: ['./fp-funding-source.component.css']
})
export class FpFundingSourceComponent implements OnInit {
  data: Select2OptionData[] = [];
  selectedValue: string = null;
  fy: number;
  rfaPaNumber: string;
  allRfaPaNumbers: string[];

  constructor(private logger: NGXLogger,
              private planControllerService: FsPlanControllerService,
              private planCoordinatorService: PlanCoordinatorService,
              private planModel: PlanModel) {
  }

  ngOnInit(): void {
    this.allRfaPaNumbers = [];
    this.fy = this.planModel.fundingPlanDto.planFy || getCurrentFiscalYear();
    this.planModel.grantsSearchCriteria.forEach(r => {
      this.allRfaPaNumbers.push(r.rfaPaNumber);
    });
    // this.logger.debug('allRfaPaNumbers', this.allRfaPaNumbers);
    this.rfaPaNumber = this.allRfaPaNumbers[0];
    // this.logger.debug('selected rfaPaNumber:', this.rfaPaNumber);
    this.planCoordinatorService.fundingSourceValuesEmitter.subscribe(next => {
      this.refreshSources(next.pd, next.ca);
    });
  }

  private refreshSources(pd: number, ca: string): void {
    if (!pd || !ca) {
      return;
    }
    if (!this.rfaPaNumber) {
      this.logger.error('No rfaPaNumber available. Not refreshing sources');
      // tslint:disable-next-line:no-console
      console.trace('missing rfaPaNumber');
      return;
    }
    const tmp: Select2OptionData[] = [];
    this.planControllerService.getFundingPlanFundingSourcesUsingGET(ca, this.fy, pd, this.rfaPaNumber).subscribe(result => {
      result.forEach(s => {
        tmp.push({ id: String(s.fundingSourceId), text: s.fundingSourceName });
      });
      this.data = tmp;
    });
  }
}