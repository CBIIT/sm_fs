import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { SearchCriteria } from './search-criteria';
import { SearchResultComponent } from './search-result/search-result.component';
import {
  FundSearchDashboardDataDto,
  FundSelectSearchCriteria,
  FsSearchControllerService,
  FsDesigneeControllerService
} from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { GwbLinksService } from '@cbiit/i2ecui-lib';
import { getCurrentFiscalYear } from '../utils/utils';
import {AppUserSessionService} from "../service/app-user-session.service";
import {ActivatedRoute, Router} from "@angular/router";
import {SearchModel} from "./model/search-model";
import { BatchApproveService } from './batch-approve/batch-approve.service';
import {FundingRequestPermDelDto} from "@cbiit/i2ecws-lib/model/fundingRequestPermDelDto";

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  providers: [BatchApproveService]
})
export class SearchComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(SearchResultComponent) searchResultComponent: SearchResultComponent;

  labelSearch: string = 'for Individual Requests';
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
   selectedMenuUrl: string;

  keepSearchCriteriaModel: boolean;

  errInactiveDesignees: boolean;

  constructor(private logger: NGXLogger,
              private router: Router,
              private route: ActivatedRoute,
              private searchModel: SearchModel,
              private userSessionService: AppUserSessionService,
              private fsSearchController: FsSearchControllerService,
              private batchApproveService: BatchApproveService,
              private designeeService: FsDesigneeControllerService,
              private gwbLinksService: GwbLinksService
            ) {
  }

  ngOnDestroy(): void {
    if (!this.keepSearchCriteriaModel) {
      this.searchModel.reset();
    }
  }

  ngOnInit(): void {

    this.selectedMenuUrl = (this.route.snapshot.url && this.route.snapshot.url.length > 0) ?
                            this.route.snapshot.url[this.route.snapshot.url.length - 1].path : '';
    this.logger.debug('ngOnInit() segment = ', this.selectedMenuUrl);
    this.isPd = this.userSessionService.isPD();
    this.isPa = this.userSessionService.isPA();
    this.hasPaylineRoles = this.userSessionService.hasRole('OEFIACRT') ||  this.userSessionService.hasRole('DES');

    this.currentFY = getCurrentFiscalYear();
    // this.paylistDashboardUrl =  this.gwbLinksService.getProperty('Paylist')+ '#side-nav-paylists';
    this.paylistDashboardUrl = '/paylist/#side-nav-paylists';

    this.invokeRefreshOverview(true);

    this.batchApproveService.initialize();
    let action = this.route.snapshot.params.action;
    this.logger.debug('ngOnInit() - route action, searchType, state.action:', action, this.searchModel.searchType, history.state);
    if (action && action != 'landing') {
      const navigateAction = (action === 'immediate') ? this.searchModel.searchType : action;

      // this is a return link from the FR or FP view
      // check the searchType from the search model
      // and replace 'immediate' with one of the saved dashboard action type
      // skip 'landing' action - it will be processed when Overview is loaded
      if (navigateAction) {
        switch(navigateAction) {
          case 'FR':
          case 'awaitfr':
          case 'myfr':
          case 'mycafr':
          case 'myportfoliofr':
          case 'myreviewfr':
            this.keepSearchCriteriaModel = true;
            this.router.navigateByUrl('/search/fr', { state: { action: navigateAction}});
            break;
          case 'FP':
          case 'awaitfp':
          case 'myfp':
          case 'myreviewfp':
            this.keepSearchCriteriaModel = true;
            this.router.navigateByUrl('/search/fp', { state: { action: navigateAction}});
            break;
          case 'G':
            this.keepSearchCriteriaModel = true;
            this.router.navigateByUrl('/search/grants', { state: { action: navigateAction}});
            break;
        }
      }
    }
  }

  ngAfterViewInit() {
    this.logger.debug('ngAfterViewInit(): state.action:', history.state);

    if (history.state?.action) {
      setTimeout(() => {
        switch(history.state.action) {
          case 'FR':
          case 'FP':
          case 'G':
            this.action = 'immediate'
            break;
          case 'awaitfr':
            this.searchAwaitingRequests();
            break;
          case 'myfr':
            this.searchMyRequests();
            break;
          case 'mycafr':
            this.searchMyCARequests();
            break;
          case 'myportfoliofr':
            this.searchMyPortfolioRequests();
            break;
          case 'myreviewfr':
            this.searchMyUnderReviewRequests();
            break;
          case 'awaitfp':
            this.searchAwaitingPlans();
            break;
          case 'myfp':
            this.searchMyPlans();
            break;
          case 'myreviewfp':
            this.searchMyUnderReviewPlans();
            break;
        }
      }, 0);
    }
  }

  doSearch(sc: SearchCriteria) {
    if (sc?.searchType === 'clear') {
      this.searchResultComponent.clear();
      return;
    }
    this.searchModel.searchType = sc.searchType;
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
    else if (sc.searchType === 'G') {
      const fsCritera: FundSelectSearchCriteria = {};
      fsCritera.fyFrom = sc.fyRange?.fromFy;
      fsCritera.fyTo = sc.fyRange?.toFy;
      fsCritera.i2status = sc.i2status;
      fsCritera.grantIc = sc.grantNumber?.grantNumberIC;
      fsCritera.grantMech = sc.grantNumber?.grantNumberMech;
      fsCritera.grantSerial = sc.grantNumber?.grantNumberSerial;
      fsCritera.grantSuffix = sc.grantNumber?.grantNumberSuffix;
      fsCritera.grantType = sc.grantNumber?.grantNumberType;
      fsCritera.grantYear = sc.grantNumber?.grantNumberYear;
      fsCritera.piName = sc.piName;

      this.logger.debug("Search Grants criteria in component: ", fsCritera);
      this.searchResultComponent.doGrantSearch(fsCritera,
        FilterTypeLabels.FILTER_GRANT);
    }
  }

  onAwaitingRequests() {
    if (this.selectedMenuUrl != 'fr') {
      this.router.navigateByUrl('/search/fr', { state: { action: 'awaitfr'}});
    }
    else {
      this.searchAwaitingRequests();
    }
  }

  searchAwaitingRequests() {
    this.searchModel.searchType = 'awaitfr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_REQUEST_AWAITING_RESPONSE;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_REQUEST_AWAITING_RESPONSE);
  }

  onMyRequests() {
    if (this.selectedMenuUrl != 'fr') {
      this.router.navigateByUrl('/search/fr', { state: { action: 'myfr'}});
    }
    else {
      this.searchMyRequests();
    }
  }

  searchMyRequests() {
    this.searchModel.searchType = 'myfr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_MYREQUEST;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_MYREQUEST);
  }

  onMyCARequests() {
    if (this.selectedMenuUrl != 'fr') {
      this.router.navigateByUrl('/search/fr', { state: { action: 'mycafr'}});
    }
    else {
      this.searchMyCARequests();
    }
  }

  searchMyCARequests() {
    this.searchModel.searchType = 'mycafr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.myCancerActivities = this.userSessionService.getUserCaCodes();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_CANCER_ACTIVITIES;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_CANCER_ACTIVITIES);
  }

  onMyPortfolioRequests() {
    if (this.selectedMenuUrl != 'fr') {
      this.router.navigateByUrl('/search/fr', { state: { action: 'myportfoliofr'}});
    }
    else {
      this.searchMyPortfolioRequests();
    }
  }

  searchMyPortfolioRequests() {
    this.searchModel.searchType = 'myportfoliofr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_PORTFOLIO;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_PORTFOLIO);
  }

  onMyUnderReviewRequests() {
    if (this.selectedMenuUrl != 'fr') {
      this.router.navigateByUrl('/search/fr', { state: { action: 'myreviewfr'}});
    }
    else {
      this.searchMyUnderReviewRequests();
    }
  }

  searchMyUnderReviewRequests() {
    this.searchModel.searchType = 'myreviewfr';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_REQUEST_UNDER_REVIEW;
    this.searchResultComponent.doFundingRequestSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_REQUEST_UNDER_REVIEW);
  }

  onAwaitingPlans() {
    if (this.selectedMenuUrl != 'fp') {
      this.router.navigateByUrl('/search/fp', { state: { action: 'awaitfp'}});
    }
    else {
      this.searchAwaitingPlans();
    }
  }

  searchAwaitingPlans() {
    this.searchModel.searchType = 'awaitfp';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_FUNDING_PLAN_AWAITING_RESPONSE
    this.searchResultComponent.doFundingPlanSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_FUNDING_PLAN_AWAITING_RESPONSE);  }

  onMyPlans() {
    if (this.selectedMenuUrl != 'fp') {
      this.router.navigateByUrl('/search/fp', { state: { action: 'myfp'}});
    }
    else {
      this.searchMyPlans();
    }
  }

  searchMyPlans() {
    this.searchModel.searchType = 'myfp';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_MY_FUNDING_PLAN;
    this.searchResultComponent.doFundingPlanSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_MY_FUNDING_PLAN);  }

  onMyUnderReviewPlans() {
    if (this.selectedMenuUrl != 'fp') {
      this.router.navigateByUrl('/search/fp', { state: { action: 'myreviewfp'}});
    }
    else {
      this.searchMyUnderReviewPlans();
    }
  }

  searchMyUnderReviewPlans() {
    this.searchModel.searchType = 'myreviewfp';
    this.setFyFilterCriteria();
    this.fsFilterCriteria.searchWithIn= FilterTypes.FILTER_FUNDING_PLAN_UNDER_REVIEW;
    this.searchResultComponent.doFundingPlanSearch(this.fsFilterCriteria,
      FilterTypeLabels.FILTER_FUNDING_PLAN_UNDER_REVIEW);
  }

  onSearchType(type: string) {
    this.labelSearch = type === 'FR' ? 'for Individual Requests' : (type === 'FP' ? 'for Existing Plans' : (type === 'PL' ? 'for Existing Paylists' :  'by Grants'));
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

  // FN0091 - Hierarchical role-based landing page
  processLandingPageHierarchy() {
    if (this.numAwaitingRequests > 0) {
      this.searchAwaitingRequests();
    }
    else if (this.numAwaitingPlans > 0) {
      this.onAwaitingPlans();
    }
    else if (this.isPd && this.numMyPortfolioRequests > 0) {
      this.searchMyPortfolioRequests();
    }
    else if (this.hasCancerActivities && this.numMyCARequests > 0) {
      this.searchMyCARequests();
    }
    // else {
    //   this.router.navigateByUrl('/search/fr');
    // }
  }

  refreshOverview() {
    this.invokeRefreshOverview(false);
  }

  invokeRefreshOverview(checkLanding: boolean): void {
    this.fsSearchController.getSearchDashboardDataUsingGET().subscribe(
      result => {
        this.dashboardDatafilterMap = new Map(result.map(item => [item.fitlerType, item]));
        this.logger.debug('Overview refreshed:', this.dashboardDatafilterMap);
        this.setFilterCounts(this.dashboardDatafilterMap);
        if (this.selectedMenuUrl === 'landing' && checkLanding) {
          this.processLandingPageHierarchy();
        }
      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
    });
    if (this.selectedMenuUrl === 'landing' && checkLanding) {
      this.designeeService.getAllApproverDesigneesUsingGET(this.userSessionService.getLoggedOnUser().nihNetworkId).subscribe(
        (result: Array<FundingRequestPermDelDto>) => {
          this.logger.debug('Get designees for user: ', result);
          this.errInactiveDesignees = false;
          for (const entry of result) {
            if (entry.newNedOrg || entry.newClassification || entry.inactiveNedDate || entry.inactiveI2eDate) {
              this.errInactiveDesignees = true;
              break;
            }
          }
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
      });
    }
  }

  onKeepSearchCriteria(): void {
    this.keepSearchCriteriaModel = true;
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
   FILTER_FUNDING_REQUEST = "Search for Individual Requests",
   FILTER_FUNDING_PLAN = "Search for Existing Plans",
   FILTER_GRANT = "Search by Grants"
}


