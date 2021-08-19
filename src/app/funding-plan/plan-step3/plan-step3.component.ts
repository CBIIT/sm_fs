import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { PlanModel } from '../../model/plan/plan-model';
import { PdCaIntegratorService } from '@nci-cbiit/i2ecui-lib';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';

@Component({
  selector: 'app-plan-step3',
  templateUrl: './plan-step3.component.html',
  styleUrls: ['./plan-step3.component.css']
})
export class PlanStep3Component implements OnInit {
  @ViewChild('step3form', { static: false }) step3form: NgForm;
  private pd: number;
  private cayCode: string;
  private doc: string;


  constructor(private navigationModel: NavigationStepModel,
              private router: Router,
              private logger: NGXLogger,
              private planModel: PlanModel,
              private pdCaIntegratorService: PdCaIntegratorService,
              private planCoordinatorService: PlanCoordinatorService) {
  }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(3, true);
    this.pdCaIntegratorService.pdValueEmitter.subscribe(next => {
      this.pd = next;
      this.planCoordinatorService.fundingSourceValuesEmitter.next({ pd: this.pd, ca: this.cayCode });
    });
    this.pdCaIntegratorService.cayCodeEmitter.subscribe(next => {
      this.cayCode = typeof next === 'string' ? next : next[0];
      this.planCoordinatorService.fundingSourceValuesEmitter.next({ pd: this.pd, ca: this.cayCode });
    });
    this.pdCaIntegratorService.docEmitter.subscribe(next => {
      this.doc = next;
    });
  }

  saveContinue(): void {
  }

  previous(): void {
    this.router.navigate(['/plan/step2']);
  }

  onSubmit($event: any): void {
    this.logger.debug($event);
    this.logger.debug(this.step3form);
    if (this.step3form.valid) {
      this.router.navigate(['/plan/step4']);
    }
  }
}
