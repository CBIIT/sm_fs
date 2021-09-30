import { Component, OnInit, ViewChild } from '@angular/core';
import { SearchCriteria } from './search-criteria';
import { SearchResultComponent } from './search-result/search-result.component';
import { FundSearchDashboardDataDto , FundSelectSearchCriteria , FsSearchControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { getCurrentFiscalYear } from 'src/app/utils/utils';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  @ViewChild(SearchResultComponent) searchResultComponent: SearchResultComponent;

  labelSearch: string = 'Requests';
  currentFY: number = 2021;
  showOverview: boolean = true;
  numAwaitingRequests: number;
  numMyRequests: number ;
  numMyCARequests: number ;
  numMyPortfolioRequests: number ;
  numMyUnderReviewRequests: number ;
  numAwaitingPlans: number ;
  numMyPlans: number ;
  numMyUnderReviewPlans: number ;
  dashboardDatafilterList: any;
  dashboardDatafilterMap: Map<string, FundSearchDashboardDataDto>;
   fsFilterCriteria: FundSelectSearchCriteria = {};


  constructor(private logger: NGXLogger, 
              private fsSearchController:FsSearchControllerService
            ) { }

  ngOnInit(): void {

    this.currentFY = getCurrentFiscalYear();
    this.fsSearchController.getSearchDashboardDataUsingGET().subscribe(
      result => {
        this.dashboardDatafilterMap = new Map(result.map(item => [item.fitlerType, item]));
        this.setFilterCounts(this.dashboardDatafilterMap);
      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
      });


  }

  doSearch(sc: SearchCriteria) {
    let fsCritera: FundSelectSearchCriteria = {};
    fsCritera.fyFrom = sc.fyRange?.fromFy;
    fsCritera.fyTo = sc.fyRange?.toFy;
    fsCritera.requestType = sc.frTypes;
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
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_REQUEST_AWAITING_RESPONSE;
    this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onMyRequests() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_MYREQUEST;
    this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onMyCARequests() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_CANCER_ACTIVITIES;
    this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onMyPortfolioRequests() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_PORTFOLIO;
    this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onMyUnderReviewRequests() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_REQUEST_UNDER_REVIEW;
    this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onAwaitingPlans() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_FUNDING_PLAN_AWAITING_RESPONSE
  //  this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onMyPlans() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_MY_FUNDING_PLAN;
   // this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }

  onMyUnderReviewPlans() {
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_FUNDING_PLAN_UNDER_REVIEW;
  //  this.searchResultComponent.doSearch(this.fsFilterCriteria);
  }


  onSearchType(type: string) {
    this.labelSearch = type === 'FR' ? 'Requests' : (type === 'FP' ? 'Plans' : (type === 'PL' ? 'Paylists' :  'Grants'));
  }

  setFyFilterCriteria(){
    this.fsFilterCriteria ={};
    this.fsFilterCriteria.fyFrom = this.currentFY;
    this.fsFilterCriteria.fyTo = this.currentFY;
  }
  setFilterCounts(dashboardData: Map<string, FundSearchDashboardDataDto>){

    this.numAwaitingRequests=dashboardData.get(FilterTypes.FILTER_REQUEST_AWAITING_RESPONSE).countFilterType;
    this.numMyCARequests = dashboardData.get(FilterTypes.FILTER_CANCER_ACTIVITIES).countFilterType;
    this.numMyPortfolioRequests = dashboardData.get(FilterTypes.FILTER_PORTFOLIO).countFilterType;
    this.numMyUnderReviewRequests = dashboardData.get(FilterTypes.FILTER_REQUEST_UNDER_REVIEW).countFilterType;
    this.numMyRequests - dashboardData.get(FilterTypes.FILTER_MYREQUEST).countFilterType;
    this.numMyPlans = dashboardData.get(FilterTypes.FILTER_MY_FUNDING_PLAN).countFilterType;
    this.numMyUnderReviewPlans = dashboardData.get(FilterTypes.FILTER_FUNDING_PLAN_UNDER_REVIEW).countFilterType;
    this.numAwaitingPlans = dashboardData.get(FilterTypes.FILTER_FUNDING_PLAN_AWAITING_RESPONSE).countFilterType;
    console.log(this.numAwaitingRequests);

  }
}
export enum FilterTypes {
   FILTER_PORTFOLIO = "My Portfolio",
   FILTER_CANCER_ACTIVITIES = "My Cancer Activities",
   FILTER_REQUEST_AWAITING_RESPONSE = "Requests Awaiting My Response",
   FILTER_MYREQUEST = "My Requests",
   FILTER_REQUEST_UNDER_REVIEW = "My Requests Under Review",
   FILTER_FUNDING_PLAN_AWAITING_RESPONSE = "Funding Plans Awaiting My Response",
   FILTER_MY_FUNDING_PLAN = "My Funding Plans",
   FILTER_PAYLINE = "=My Paylines",
   FILTER_FUNDING_PLAN_UNDER_REVIEW = "My Funding Plans Under Review"

}


