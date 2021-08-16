import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-plan-step3',
  templateUrl: './plan-step3.component.html',
  styleUrls: ['./plan-step3.component.css']
})
export class PlanStep3Component implements OnInit {

  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);
  }

  saveContinue(): void {
    this.router.navigate(['/plan/step4']);
  }

  previous(): void {
    this.router.navigate(['/plan/step2']);
  }

  onSubmit($event: any): void {
    this.logger.debug($event);
  }
}
