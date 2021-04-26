import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-step-indicator',
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.css']
})
export class StepIndicatorComponent implements OnInit {
  @Input() activeStep;
  @Input() steps: { step: number, name: string, route: string }[];

  constructor() {
  }

  ngOnInit(): void {
  }

}
