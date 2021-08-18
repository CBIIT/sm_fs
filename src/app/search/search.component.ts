import { Component, OnInit, ViewChild } from '@angular/core';
import { SearchCriteria } from './search-criteria';
import { SearchResultComponent } from './search-result/search-result.component';
import { FundSelectSearchCriteriaRes } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  @ViewChild(SearchResultComponent) searchResultComponent: SearchResultComponent;

  currentFY: string = '2021';
  showOverview: boolean = true;
  numAwaitingRequests: number = 0;
  numMyRequests: number = 10;
  numMyCARequests: number = 6;
  numMyPortfolioRequests: number = 3;
  numMyUnderReviewRequests: number = 4;
  numAwaitingPlans: number = 5;
  numMyPlans: number = 2;
  numMyUnderReviewPlans: number = 0;

  constructor(private logger: NGXLogger) { }

  ngOnInit(): void {
  }

  doSearch(event: SearchCriteria) {
    let fsCritera: FundSelectSearchCriteriaRes = {};
    fsCritera.fyFrom = event.fyRange.fromFy;
    fsCritera.fyTo = event.fyRange.toFy;
    fsCritera.requestType = [event.requestType];
    fsCritera.rfaPaNumber = [event.rfaPa];

    this.searchResultComponent.doSearch(fsCritera);
    this.logger.debug("Search criteria: " + fsCritera);
  }

  onAwaitingRequests() {

  }

  onMyRequests() {

  }

  onMyCARequests() {

  }

  onMyPortfolioRequests() {

  }

  onMyUnderReviewRequests() {

  }

  onAwaitingPlans() {

  }

  onMyPlans() {

  }

  onMyUnderReviewPlans() {

  }
}
