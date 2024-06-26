import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { NavigationStepModel } from '../funding-request/step-indicator/navigation-step.model';

@Component({
  selector: 'app-edit-link',
  templateUrl: './edit-link.component.html',
  styleUrls: ['./edit-link.component.css']
})
export class EditLinkComponent implements OnInit {

  @Input() target = '#';

  constructor(private logger: NGXLogger,
              private navigationStepModel: NavigationStepModel) {
    this.logger.info(JSON.stringify(this.navigationStepModel))
  }

  ngOnInit(): void {

  }

  get visible(): boolean {
    return this.navigationStepModel.showSteps;
  }

}
