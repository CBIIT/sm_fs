import { Component, OnInit } from '@angular/core';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-plan-step3',
  templateUrl: './plan-step3.component.html',
  styleUrls: ['./plan-step3.component.css']
})
export class PlanStep3Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);
  }

}
