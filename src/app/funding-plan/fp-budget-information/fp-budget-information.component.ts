import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit {

  constructor(public planModel: PlanModel) { }

  ngOnInit(): void {
  }

}
