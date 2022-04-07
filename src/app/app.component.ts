import { Component, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { PlanModel } from './model/plan/plan-model';
import { RequestModel } from './model/request/request-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(public router: Router,
              private logger: NGXLogger,
              private requestModel: RequestModel,
              private planModel: PlanModel) {
    this.logger.debug('production flag in environment?: ' + environment.production);
    this.logger.debug('is DevMode?: ' + isDevMode());
    this.requestModel.initializeProperties();
    this.planModel.initializeProperties();
  }

  title = 'Funding Selections';
}
