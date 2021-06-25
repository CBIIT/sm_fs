import {Component, Input, OnInit} from '@angular/core';
import { RequestModel } from 'src/app/model/request-model';

@Component({
  selector: 'app-step-indicator',
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.css']
})
export class StepIndicatorComponent implements OnInit {
  @Input() activeStep;
  @Input() steps: { step: number, name: string, route: string}[];

  constructor(private requestModel: RequestModel) {
  }

  ngOnInit(): void {
  }

  isStepLinkable(step: number): boolean {
    this.requestModel.clearAlerts();
    return this.requestModel.isStepLinkable(step);
  }
}
