import { Component, OnInit } from '@angular/core';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-plan-step2',
  templateUrl: './plan-step2.component.html',
  styleUrls: ['./plan-step2.component.css']
})
export class PlanStep2Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(2, false);
  }

}
