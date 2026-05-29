import { Component, isDevMode, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { environment } from 'src/environments/environment';
import { PlanModel } from './model/plan/plan-model';
import { RequestModel } from './model/request/request-model';
import { NgbInputDatepickerConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  private readonly destroying$ = new Subject<void>();

  constructor(public router: Router,
              private logger: NGXLogger,
              private msalBroadcastService: MsalBroadcastService,
              private requestModel: RequestModel,
              private planModel: PlanModel,
              private config: NgbInputDatepickerConfig) {
    this.logger.debug('production flag in environment?: ' + environment.production);
    this.logger.debug('is DevMode?: ' + isDevMode());
    this.requestModel.initializeProperties();
    this.planModel.initializeProperties();
    this.config.weekdays = 'short';
  }

  ngOnInit(): void {
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroying$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroying$.next(undefined);
    this.destroying$.complete();
  }

  title = 'Funding Selections';
}
