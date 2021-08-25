import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NgForm } from '@angular/forms';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { FpProgramRecommendedCostsComponent } from '../fp-program-recommended-costs/fp-program-recommended-costs.component';

@Component({
  selector: 'app-applications-proposed-for-funding',
  templateUrl: './applications-proposed-for-funding.component.html',
  styleUrls: ['./applications-proposed-for-funding.component.css']
})
export class ApplicationsProposedForFundingComponent implements OnInit {
  @Input() parentForm: NgForm;
  @ViewChildren(FpProgramRecommendedCostsComponent) prcList: QueryList<FpProgramRecommendedCostsComponent>;
  comments: string;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  listSelectedSources: string[];

  sourceSumDirectCost(): number {
    if (!this.prcList) {
      return 0;
    }
    let sum = 0;
    this.prcList.forEach(control => {
      if (control.displayType === 'percent') {
        if (!isNaN(control.directCostCalculated)) {
          sum = sum + Number(control.directCostCalculated);
        }
      } else {
        if (!isNaN(control.directCost)) {
          sum = sum + Number(control.directCost);
        }
      }
    });
    return sum;
  }

  sourceSumTotalCost(): number {
    if (!this.prcList) {
      return 0;
    }
    let sum = 0;
    this.prcList.forEach(control => {
      if (control.displayType === 'percent') {
        if (!isNaN(control.totalCostCalculated)) {
          sum = sum + Number(control.totalCostCalculated);
        }
      } else {
        if (!isNaN(control.totalCost)) {
          sum = sum + Number(control.totalCost);
        }
      }
    });

    return sum;
  }


  constructor(private logger: NGXLogger, private planModel: PlanModel,
              private planCoordinatorService: PlanCoordinatorService) {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

  }

  ngOnInit(): void {

  }
}
