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
  directCost: number;
  totalCost: number;
  percentCut: number;
  directCostCalculated: number;
  totalCostCalculated: number;
  percentCutCalculated: number;
  displayType: string;

  constructor(private planCoordinatorService: PlanCoordinatorService, private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.planCoordinatorService.grantInfoCostEmitter.subscribe(next => {
      if (next.index === this.index) {
        this.logger.debug('new values received: ', next);
        this.directCost = next.dc;
        this.totalCost = next.tc;
      }
    });
  }

  toggleDisplay(value: string): void {
    this.displayType = value;
  }
}
