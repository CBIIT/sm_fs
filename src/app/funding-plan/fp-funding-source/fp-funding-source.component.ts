import { Component, OnInit } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { FsPlanControllerService } from '@nci-cbiit/i2ecws-lib';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-fp-funding-source',
  templateUrl: './fp-funding-source.component.html',
  styleUrls: ['./fp-funding-source.component.css']
})
export class FpFundingSourceComponent implements OnInit {
  data: Select2OptionData[] = [];
  selectedValue: string;
  fy: number;
  rfaPaNumber: string;
  allRfaPaNumbers: string[];

  constructor(private logger: NGXLogger,
              private planControllerService: FsPlanControllerService,
              private planCoordinatorService: PlanCoordinatorService,
              private planModel: PlanModel) {
    this.logger.debug('plan fiscal year', this.planModel.fundingPlanDto.planFy);
  }

  ngOnInit(): void {
    this.allRfaPaNumbers = [];
    this.fy = this.planModel.fundingPlanDto.planFy;
    this.logger.debug('fiscal year:', this.fy);
    this.planModel.grantsSearchCriteria.forEach(r => {
      this.allRfaPaNumbers.push(r.rfaPaNumber);
    });
    this.rfaPaNumber = this.allRfaPaNumbers[0];
    this.planCoordinatorService.fundingSourceValuesEmitter.subscribe(next => {
      this.refreshSources(next.pd, next.ca);
    });
  }

  private refreshSources(pd: number, ca: string): void {
    if (!pd || !ca) {
      return;
    }
    const tmp: Select2OptionData[] = [];
    this.planControllerService.getFundingPlanFundingSourcesUsingGET(ca, this.fy, pd, this.rfaPaNumber).subscribe(result => {
      this.logger.debug(result);
      result.forEach(s => {
        tmp.push({ id: String(s.fundingSourceId), text: s.fundingSourceName });
      });
      this.data = tmp;
      this.logger.debug(this.data);
    });
  }
}
