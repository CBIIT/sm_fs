import { Component, OnInit } from '@angular/core';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-plan-step5',
  templateUrl: './plan-step5.component.html',
  styleUrls: ['./plan-step5.component.css']
})
export class PlanStep5Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(5, true);
  }

}
