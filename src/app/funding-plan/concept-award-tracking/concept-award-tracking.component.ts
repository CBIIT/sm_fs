import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-concept-award-tracking',
  templateUrl: './concept-award-tracking.component.html',
  styleUrls: ['./concept-award-tracking.component.css']
})
export class ConceptAwardTrackingComponent implements OnInit {

  // TODO: See FundingPlanFoasVw.cptId

  constructor(public planModel: PlanModel) {
  }

  ngOnInit(): void {
  }

}
