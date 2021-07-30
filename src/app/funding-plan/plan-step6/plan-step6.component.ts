import { Component, OnInit } from '@angular/core';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-plan-step6',
  templateUrl: './plan-step6.component.html',
  styleUrls: ['./plan-step6.component.css']
})
export class PlanStep6Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(6, true);
  }

}
