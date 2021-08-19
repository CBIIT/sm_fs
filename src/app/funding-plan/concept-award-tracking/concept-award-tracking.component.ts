import { Component, Input, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-concept-award-tracking',
  templateUrl: './concept-award-tracking.component.html',
  styleUrls: ['./concept-award-tracking.component.css']
})
export class ConceptAwardTrackingComponent implements OnInit {
  @Input() cptId: number;
  url: string;

  constructor(public planModel: PlanModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.url = this.planModel.catsConceptUrl + this.cptId;
  }

}
