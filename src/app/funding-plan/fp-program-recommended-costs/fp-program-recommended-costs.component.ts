import { Component, Input, OnInit } from '@angular/core';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';

@Component({
  selector: 'app-fp-program-recommended-costs',
  templateUrl: './fp-program-recommended-costs.component.html',
  styleUrls: ['./fp-program-recommended-costs.component.css']
})
export class FpProgramRecommendedCostsComponent implements OnInit {
  @Input() grantIndex: number;
  @Input() sourceIndex: number;
  @Input() grant: NciPfrGrantQueryDtoEx;
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
    // TODO: get this from the grant?
    this.planCoordinatorService.grantInfoCostEmitter.subscribe(next => {
      if (next.index === this.grantIndex) {
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
