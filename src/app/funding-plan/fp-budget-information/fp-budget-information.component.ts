import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit {

  constructor(
    public planModel: PlanModel,
    private logger: NGXLogger) { }

  ngOnInit(): void {
    this.logger.debug('planModel', this.planModel);
  }

}
