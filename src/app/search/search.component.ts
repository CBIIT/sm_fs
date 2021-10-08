import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { SearchCriteria } from './search-criteria';
import { SearchResultComponent } from './search-result/search-result.component';
import { FundSearchDashboardDataDto , FundSelectSearchCriteria , FsSearchControllerService  } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { GwbLinksService } from '@nci-cbiit/i2ecui-lib';
import { getCurrentFiscalYear } from 'src/app/utils/utils';
import {AppUserSessionService} from "../service/app-user-session.service";
import {ActivatedRoute} from "@angular/router";
import {SearchModel} from "./model/search-model";
import { BatchApproveService } from './batch-approve/batch-approve.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  providers: [BatchApproveService]
})
export class SearchComponent implements OnInit, AfterViewInit {
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
  numMyPaylines : number;
  isPd : boolean;
  isPa : boolean;
  hasPaylineRoles : boolean;
  hasCancerActivities : boolean;
  dashboardDatafilterList: any;
  dashboardDatafilterMap: Map<string, FundSearchDashboardDataDto>;
   fsFilterCriteria: FundSelectSearchCriteria = {};
   paylistDashboardUrl : string;

   action: string;

  constructor(private logger: NGXLogger,
              private route: ActivatedRoute,
              private searchModel: SearchModel,
              private userSessionService: AppUserSessionService,
              private fsSearchController: FsSearchControllerService,
              private batchApproveService: BatchApproveService,
              private gwbLinksService: GwbLinksService
            ) { }

  ngOnInit(): void {

    this.isPd = this.userSessionService.isPD();
    this.isPa = this.userSessionService.isPA();
    this.hasPaylineRoles = this.userSessionService.hasRole('OEFIACRT') ||  this.userSessionService.hasRole('DES');

    this.currentFY = getCurrentFiscalYear();
    this.paylistDashboardUrl =  this.gwbLinksService.getProperty('Paylist')+ '#side-nav-paylists';

    this.fsSearchController.getSearchDashboardDataUsingGET().subscribe(
      result => {
        this.dashboardDatafilterMap = new Map(result.map(item => [item.fitlerType, item]));
        this.setFilterCounts(this.dashboardDatafilterMap);
      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
      });
    this.batchApproveService.initialize();
    let action = this.route.snapshot.params.action;
    if (action) {
      setTimeout(() => {
        if (action === 'immediate') {
          // this is a return link from the FR or FP view
          // check the searchType from the search model
          // and replace 'immediate' with one of the saved dashboard action type
          if (this.searchModel.searchType &&
               this.searchModel.searchType != 'FR' &&
               this.searchModel.searchType != 'FP' &&
               this.searchModel.searchType != 'PL' &&
               this.searchModel.searchType != 'R') {
            action = this.searchModel.searchType; // replace action 'immediate' with one of the dashboard types
          }
        }

        switch (action) {
          case 'immediate':
            // this is a return link from the FR or FP view
            // check the searchType from the return code
            this.action = action;
            break;
          case 'awaitfr':
            this.onAwaitingRequests();
            break;
          case 'myfr':
            this.onMyRequests();
            break;
          case 'mycafr':
            this.onMyCARequests();
            break;
          case 'myportfoliofr':
            this.onMyPortfolioRequests();
            break;
          case 'myreviewfr':
            this.onMyUnderReviewRequests();
            break;
          case 'awaitfp':
            this.onAwaitingPlans();
            break;
          case 'myfp':
            this.onMyPlans();
            break;
          case 'myreviewfp':
            this.onMyUnderReviewPlans();
            break;
        }
      }, 0);
    }
  }

  ngAfterViewInit() {
  }

  doSearch(sc: SearchCriteria) {
    if (sc.searchType === 'FR') {
      const fsCritera: FundSelectSearchCriteria = {};
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
      if (sc.requestingDoc && sc.requestingDoc.length > 0) {
        fsCritera.requestingDoc = [sc.requestingDoc];
      }
      if (sc.doc && sc.doc.length > 0) {
        fsCritera.doc = [sc.doc];
      }
      if (sc.fundingSources && sc.fundingSources.length > 0) {
        fsCritera.fundingSource = [sc.fundingSources];
      }
      if (sc.id && sc.id.length > 0 && !isNaN(+sc.id)) {
        fsCritera.requestId = [Number(sc.id)];
      }
      if (sc.pdName && !isNaN(+sc.pdName)) {
        fsCritera.pdNpnId = Number(sc.pdName);
      }
      if (sc.requestingPd && !isNaN(+sc.requestingPd)) {
        fsCritera.requestingPdNpnId = Number(sc.requestingPd);
      }


      fsCritera.piName = sc.piName;
      fsCritera.institution = sc.institutionName;


      this.logger.debug("Search Funding Requests criteria in component: ", fsCritera);
      this.searchResultComponent.doFundingRequestSearch(fsCritera,
        FilterTypeLabels.FILTER_FUNDING_REQUEST);
    }
    else if (sc.searchType === 'FP') {
      const fsCritera: FundSelectSearchCriteria = {};
      fsCritera.fyFrom = sc.fyRange?.fromFy;
      fsCritera.fyTo = sc.fyRange?.toFy;
      fsCritera.fsStatus = sc.fundingPlanStatus;
      fsCritera.institution = sc.institutionName;
      fsCritera.ncabFrom = sc.ncabRange?.fromNcab;
      fsCritera.ncabTo = sc.ncabRange?.toNcab;
      fsCritera.piName = sc.piName;
      fsCritera.requestingDoc = [];
      if (sc.requestingDoc && sc.requestingDoc.length > 0) {
        fsCritera.requestingDoc = [sc.requestingDoc];
      }
      if (sc.doc && sc.doc.length > 0) {
        fsCritera.doc = [sc.doc];
      }
      if (sc.fundingSources && sc.fundingSources.length > 0) {
        fsCritera.fundingSource = [sc.fundingSources];
      }
      if (sc.rfaPa && sc.rfaPa.length > 0) {
        fsCritera.rfaPaNumber = [sc.rfaPa];
      }
      if (sc.id && sc.id.length > 0 && !isNaN(+sc.id)) {
        fsCritera.planId = [Number(sc.id)];
      }
      fsCritera.grantIc = sc.grantNumber?.grantNumberIC;
      fsCritera.grantMech = sc.grantNumber?.grantNumberMech;
      fsCritera.grantSerial = sc.grantNumber?.grantNumberSerial;
      fsCritera.grantSuffix = sc.grantNumber?.grantNumberSuffix;
      fsCritera.grantType = sc.grantNumber?.grantNumberType;
      fsCritera.grantYear = sc.grantNumber?.grantNumberYear;

      if (sc.pdName && !isNaN(+sc.pdName)) {
        fsCritera.pdNpnId = Number(sc.pdName);
      }
      if (sc.requestingPd && !isNaN(+sc.requestingPd)) {
        fsCritera.requestingPdNpnId = Number(sc.requestingPd);
      }

      this.logger.debug("Search Funding Plans criteria in component: ", fsCritera);
      this.searchResultComponent.doFundingPlanSearch(fsCritera,
        FilterTypeLabels.FILTER_FUNDING_PLAN);
    }
  }

  onAwaitingRequests() {
    this.searchModel.searchType = 'awaitfr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_REQUEST_AWAITING_RESPONSE;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_FUNDING_PLAN_AWAITING_RESPONSE);
  }

  onMyRequests() {
    this.searchModel.searchType = 'myfr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_MYREQUEST;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_MYREQUEST);
  }

  onMyCARequests() {
    this.searchModel.searchType = 'mycafr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.myCancerActivities = this.userSessionService.getUserCaCodes();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_CANCER_ACTIVITIES;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_CANCER_ACTIVITIES);
  }

  onMyPortfolioRequests() {
    this.searchModel.searchType = 'myportfoliofr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_PORTFOLIO;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_PORTFOLIO);
  }

  onMyUnderReviewRequests() {
    this.searchModel.searchType = 'myreviewfr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_REQUEST_UNDER_REVIEW;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_REQUEST_UNDER_REVIEW);
  }

  onAwaitingPlans() {
    this.searchModel.searchType = 'awaitfp';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_FUNDING_PLAN_AWAITING_RESPONSE
    this.searchResultComponent.doFundingPlanSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_FUNDING_PLAN_AWAITING_RESPONSE);  }

  onMyPlans() {
    this.searchModel.searchType = 'myfp';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_MY_FUNDING_PLAN;
    this.searchResultComponent.doFundingPlanSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_MY_FUNDING_PLAN);  }

  onMyUnderReviewPlans() {
    this.searchModel.searchType = 'myreviewfp';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_FUNDING_PLAN_UNDER_REVIEW;
    this.searchResultComponent.doFundingPlanSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_FUNDING_PLAN_UNDER_REVIEW);
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
    this.numMyRequests = dashboardData.get(FilterTypes.FILTER_MYREQUEST).countFilterType;
    this.numMyPlans = dashboardData.get(FilterTypes.FILTER_MY_FUNDING_PLAN).countFilterType;
    this.numMyUnderReviewPlans = dashboardData.get(FilterTypes.FILTER_FUNDING_PLAN_UNDER_REVIEW).countFilterType;
    this.numAwaitingPlans = dashboardData.get(FilterTypes.FILTER_FUNDING_PLAN_AWAITING_RESPONSE).countFilterType;
    this.hasCancerActivities = dashboardData.get(FilterTypes.FILTER_CANCER_ACTIVITIES).canDisplayFilerType;
    this.numMyPaylines = dashboardData.get(FilterTypes.FILTER_PAYLINE).countFilterType;
  }

  filterTypeLabels = FilterTypeLabels;
}
export enum FilterTypes {
   FILTER_PORTFOLIO = "My Portfolio",
   FILTER_CANCER_ACTIVITIES = "My Cancer Activities",
   FILTER_REQUEST_AWAITING_RESPONSE = "Requests Awaiting My Response",
   FILTER_MYREQUEST = "My Requests",
   FILTER_REQUEST_UNDER_REVIEW = "My Requests Under Review",
   FILTER_FUNDING_PLAN_AWAITING_RESPONSE = "Funding Plans Awaiting My Response",
   FILTER_MY_FUNDING_PLAN = "My Funding Plans",
   FILTER_PAYLINE = "My Paylines",
   FILTER_FUNDING_PLAN_UNDER_REVIEW = "My Funding Plans Under Review"
}

export enum FilterTypeLabels {
   FILTER_PORTFOLIO = "Requests in My Portfolio",
   FILTER_CANCER_ACTIVITIES = "Requests in My CAs",
   FILTER_REQUEST_AWAITING_RESPONSE = "Requests Awaiting My Response",
   FILTER_MYREQUEST = "My Requests",
   FILTER_REQUEST_UNDER_REVIEW = "My Requests Under Review",
   FILTER_FUNDING_PLAN_AWAITING_RESPONSE = "Funding Plans Awaiting My Response",
   FILTER_MY_FUNDING_PLAN = "My Funding Plans",
   FILTER_PAYLINE = "=My Paylines",
   FILTER_FUNDING_PLAN_UNDER_REVIEW = "My Funding Plans Under Review",
   FILTER_FUNDING_REQUEST = "Search for Existing Requests",
   FILTER_FUNDING_PLAN = "Search for Existing Plans"
}


