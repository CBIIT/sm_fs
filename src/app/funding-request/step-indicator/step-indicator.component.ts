import {Component, Input, OnInit} from '@angular/core';
import { NavigationStepModel } from './navigation-step.model';

@Component({
  selector: 'app-step-indicator',
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.css']
})
export class StepIndicatorComponent implements OnInit {
  @Input() activeStep;
  @Input() steps: { step: number, name: string, route: string}[];

  width = '25%';

  constructor(private model: NavigationStepModel) {
  }

  ngOnInit(): void {
    if (this.steps && this.steps.length > 0) {
      this.width = 100 / this.steps.length + '%';
    }
  }

  isStepLinkable(step: number): boolean {
    return this.model.isStepLinkable(step);
  }
}
