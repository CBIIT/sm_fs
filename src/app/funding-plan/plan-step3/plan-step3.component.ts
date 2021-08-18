import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-plan-step3',
  templateUrl: './plan-step3.component.html',
  styleUrls: ['./plan-step3.component.css']
})
export class PlanStep3Component implements OnInit {
  @ViewChild('step3form', { static: false }) step3form: NgForm;


  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger,
              private planModel: PlanModel) {
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
    this.logger.debug(this.step3form);
  }
}
