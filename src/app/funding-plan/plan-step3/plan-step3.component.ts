import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-plan-step3',
  templateUrl: './plan-step3.component.html',
  styleUrls: ['./plan-step3.component.css']
})
export class PlanStep3Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel,
              private router: Router) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);
  }

  saveContinue(): void {
    this.router.navigate(['/plan/step4']);
  }

  previous(): void {
    this.router.navigate(['/plan/step2']);
  }

}
