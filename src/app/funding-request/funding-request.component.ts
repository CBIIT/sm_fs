import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {RequestModel} from '../model/request-model';
import {SearchFilterService} from '../search/search-filter.service';
import {GrantsSearchFilterService} from './grants-search/grants-search-filter.service';

@Component({
  selector: 'app-funding-request',
  templateUrl: './funding-request.component.html',
  styleUrls: ['./funding-request.component.css'],
  providers: [GrantsSearchFilterService, SearchFilterService]
})
export class FundingRequestComponent implements OnInit, OnDestroy {
  activeStep = {step: 0, name: '', route: ''};
  steps = [
    {step: 1, name: 'Select Grant', route: '/request/step1'},
    {step: 2, name: 'Request Info', route: '/request/step2'},
    {step: 3, name: 'Supporting Docs', route: '/request/step3'},
    {step: 4, name: 'Review', route: '/request/step4'},
  ];

  private routerSub: Subscription;

  model;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private requestModel: RequestModel) {
  }

  ngOnDestroy(): void {
    if (this.routerSub && !this.routerSub.closed) {
      this.routerSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.model = this.requestModel;

    this.routerSub = this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        for (const step of this.steps) {
          if (step.route === val.urlAfterRedirects) {
            this.activeStep = step;
            break;
          }
        }
      }
    });

    // when direct access using url
    for (const step of this.steps) {
      if (step.route === this.router.url) {
        this.activeStep = step;
      }
    }
  }


}
