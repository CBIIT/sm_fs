import { Component, OnInit, ViewChild } from '@angular/core';
import { SearchCriteria } from './search-criteria';
import { SearchResultComponent } from './search-result/search-result.component';
import { FundSelectSearchCriteria } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  @ViewChild(SearchResultComponent) searchResultComponent: SearchResultComponent;

  labelSearch: string = 'Requests';
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

  doSearch(sc: SearchCriteria) {
    let fsCritera: FundSelectSearchCriteria = {};
    fsCritera.fyFrom = sc.fyRange?.fromFy;
    fsCritera.fyTo = sc.fyRange?.toFy;
    fsCritera.requestType = [sc.fundingRequestType];
    fsCritera.statusCodes = sc.fundingRequestStatus;
    // fsCritera.rfaPaNumber = [sc.rfaPa];
    fsCritera.grantIc = sc.grantNumber?.grantNumberIC;
    fsCritera.grantMech = sc.grantNumber?.grantNumberMech;
    fsCritera.grantSerial = sc.grantNumber?.grantNumberSerial;
    fsCritera.grantSuffix = sc.grantNumber?.grantNumberSuffix;
    fsCritera.grantType = sc.grantNumber?.grantNumberType;
    fsCritera.grantYear = sc.grantNumber?.grantNumberYear;

    this.logger.debug("Search criteria in component: ", fsCritera);
    this.searchResultComponent.doSearch(fsCritera);
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

  onSearchType(type: string) {
    this.labelSearch = type === 'FR' ? 'Requests' : (type === 'FP' ? 'Plans' : (type === 'PL' ? 'Paylists' :  'Grants'));
  }
}
