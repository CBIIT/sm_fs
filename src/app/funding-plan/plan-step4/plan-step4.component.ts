import { Component, OnInit } from '@angular/core';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-plan-step4',
  templateUrl: './plan-step4.component.html',
  styleUrls: ['./plan-step4.component.css']
})
export class PlanStep4Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(4, true);
  }

}
