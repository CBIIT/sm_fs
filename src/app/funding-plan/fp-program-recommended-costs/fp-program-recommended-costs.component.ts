import { Component, Input, OnInit } from '@angular/core';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fp-program-recommended-costs',
  templateUrl: './fp-program-recommended-costs.component.html',
  styleUrls: ['./fp-program-recommended-costs.component.css']
})
export class FpProgramRecommendedCostsComponent implements OnInit {
  @Input() index: number;
  baselineDirectCost: number;
  baselineTotalCost: number;
  directCost: number;
  totalCost: number;
  percentCut: number;
  directCostCalculated: number;
  totalCostCalculated: number;
  dcPercentCutCalculated: number;
  tcPercentCutCalculated: number;
  displayType: string;

  constructor(private planCoordinatorService: PlanCoordinatorService, private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.planCoordinatorService.grantInfoCostEmitter.subscribe(next => {
      if (next.index === this.index) {
        this.baselineDirectCost = next.dc;
        this.baselineTotalCost = next.tc;
      }
    });
  }

  toggleDisplay(value: string): void {
    this.displayType = value;
  }

  // NOTE: assuming they're entering percent cut as a whole number
  recalculate(): void {
    this.logger.debug('recalculate:', this.displayType);

    if (this.displayType === 'percent') {
      if (!!this.percentCut) {
        this.directCostCalculated = this.baselineDirectCost * (1 - (this.percentCut / 100));
        this.totalCostCalculated = this.baselineTotalCost * (1 - (this.percentCut / 100));
      }
    } else {
      if (!!this.directCost) {
        this.dcPercentCutCalculated = (this.baselineDirectCost - this.directCost) / this.baselineDirectCost;
        this.logger.debug(this.dcPercentCutCalculated);
      }

      if (!!this.totalCost) {
        this.tcPercentCutCalculated = (this.baselineTotalCost - this.totalCost) / this.baselineTotalCost;
      }
    }

  }
}
