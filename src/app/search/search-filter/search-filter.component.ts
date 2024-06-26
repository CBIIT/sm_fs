import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from '@cbiit/i2ecui-lib';
import { SearchCriteria } from '../search-criteria';
import { NGXLogger } from 'ngx-logger';
import { AppUserSessionService } from "../../service/app-user-session.service";
import { NgForm } from "@angular/forms";
import { Select2OptionData } from "ng-select2";
import { Options } from "select2";
import { SearchModel } from "../model/search-model";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css']
})
export class SearchFilterComponent implements OnInit, AfterViewInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
  @ViewChild('searchForm') searchForm: NgForm;

  private _action: string;
  @Input() set action(value: string) {
    this.logger.debug('search-filter::set action()', value);
    this._action = value;
    if (value === 'immediate') {
      setTimeout(() => this.immediateSearch(this.searchForm), 0);
    }
  }
  get action(): string {
    return this._action;
  }

  @Input() grant: string;
  @Input() searchGrant: string;

  @Output() callSearch = new EventEmitter<SearchCriteria>();
  @Output() searchTypeEm = new EventEmitter<string>()

  public searchFilter: SearchCriteria;


  showAdvanced: boolean = false;

  canSearchForPaylists: boolean;

  private _searchType: string = 'FR';

  set searchType(value: string) {
    this._searchType = value;
    this.logger.debug('Search Type set to <' + value + '>');
    this.searchTypeEm.emit(value);
  }
  get searchType() { return this._searchType; }

  //TODO - get this list from the server
  requestTypeList: Array<Select2OptionData> = [];
  requestStatusList: Array<Select2OptionData> = [
    { id: 'CANCELLED', text: 'Cancelled'},
    { id: 'COMPLETED', text: 'Completed'},
    { id: 'DRAFT', text: 'Draft'},
    { id: 'ON HOLD', text: 'On Hold'},
    { id: 'PENDING APPROVAL', text: 'Pending Approval',
      additional: ['APPROVED', 'AWC', 'DEFER', 'REASSIGNED', 'RELEASED', 'ROUTED', 'SUBMITTED']},
    { id: 'REJECTED', text: 'Rejected'},
    { id: 'RFC', text: 'Returned To PD For Changes'},
    { id: 'WITHDRAWN', text: 'Withdrawn'}
  ] ;

  statusOptions: Options = {
    multiple: true,
    allowClear: true
  };

  // Paylist related fields
  fiscalYearList: Select2OptionData[] = [];
  ncabList: Select2OptionData[] = [];
  costCenterList: Select2OptionData[] = [];

  // Pending Approval flag
  isFundingRequestPendingApproval: boolean;
  isFundingPlanPendingApproval: boolean;

  constructor(private userSessionService: AppUserSessionService,
              // private boardsControllerService: BoardsControllerService,
              // private paylistUtilControllerService: PaylistUtilControllerService,
              private route: ActivatedRoute,
              private searchModel: SearchModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug('search-filter last path, action: ', this.route.snapshot.url, this.action);
    switch(this.route.snapshot.url[this.route.snapshot.url.length - 1].path) {
      case 'fr':
        this.searchType = 'FR';
        break;
      case 'fp':
        this.searchType = 'FP';
        break;
      case 'grants':
        this.searchType = 'G';
        break;
    }
    this.searchFilter = this.searchModel.getSearchCriteria(this.searchType);
    this.searchFilter.searchType = this.searchType;
    this.showAdvanced = this._containsAdvancedInSearchFilter(this.searchFilter);
    // YP - disable search for paylist until paylist is fully merged with fs
    this.canSearchForPaylists = false;    
  }

  ngAfterViewInit() {
    setTimeout(() => {
      // next tick
      this.searchForm.form.patchValue(this.searchFilter);
      this.isFundingRequestPendingApproval = this.searchFilter.fundingRequestStatus && this.searchFilter.fundingRequestStatus.indexOf('PENDING APPROVAL') > -1;
      this.isFundingPlanPendingApproval    = this.searchFilter.fundingPlanStatus && this.searchFilter.fundingPlanStatus.indexOf('PENDING APPROVAL') > -1;
      this.logger.debug('search-filter - ngAfterViewInit() next tick: action', this.action);
      this.searchForm.form.get('fundingRequestStatus').valueChanges.subscribe(val => {
        // this.logger.debug('*** Request Type Control changes ***', val);
        if (val && val.indexOf('PENDING APPROVAL') > -1) {
          this.isFundingRequestPendingApproval = true;
        }
        else {
          this.isFundingRequestPendingApproval = false;
          this.searchForm.form.patchValue({fundingRequestApproverRole: ''});
        }
      });
      this.searchForm.form.get('fundingPlanStatus').valueChanges.subscribe(val => {
        // this.logger.debug('*** Request Type Control changes ***', val);
        if (val && val.indexOf('PENDING APPROVAL') > -1) {
          this.isFundingPlanPendingApproval = true;
        }
        else {
          this.isFundingPlanPendingApproval = false;
          this.searchForm.form.patchValue({fundingPlanApproverRole: ''});
        }
      });
    }, 0);
  }

  clear() {
    this.searchModel.reset(this.searchType);
    this.searchFilter = this.searchModel.getSearchCriteria(this.searchType);
    this.showAdvanced = false;
    this.searchForm.resetForm();
    this.searchForm.form.patchValue(this.searchFilter);
    this.callSearch.emit({ searchType: 'clear'});
  }

  immediateSearch(form: NgForm): void {
    if (this.hasGrantDetails()) {
      this.searchType = this.getSearchType();
      this.searchModel.setSearchCriteria(this.searchType, { });
      this.searchFilter = this.searchModel.getSearchCriteria(this.searchType);
      this.showAdvanced = false;
      this.searchForm.resetForm();
      const fullGrantNum = this.getFullGrantNumber().replace('-', '').replace(/ /g, '').trim();
      if (fullGrantNum && form) {
        form.form.patchValue({
          grantNumber: {
            grantNumberType: fullGrantNum.substring(0, 1),
            grantNumberMech: fullGrantNum.substring(1, 4),
            grantNumberIC: fullGrantNum.substring(4, 6),
            grantNumberSerial: fullGrantNum.substring(6, 12),
            grantNumberYear: fullGrantNum.substring(12, 14),
            grantNumberSuffix: fullGrantNum.substring(14, 18)
          }
        });
      }
    }
    this.search(form);
  }

  hasGrantDetails(): boolean {
    return (this.searchGrant && this.searchGrant.length > 0) || (this.grant && this.grant.length > 0);
  }

  getSearchType(): string {
    if(this.searchGrant && this.searchGrant.length > 0) {
      return 'G';
    } else if (this.grant && this.grant.length > 0) {
      return 'FR';
    } else {
      return null;
    }
  }

  getFullGrantNumber(): string {
    if(this.searchGrant && this.searchGrant.length > 0) {
      return this.searchGrant
    } else if (this.grant && this.grant.length > 0) {
      return this.grant;
    } else {
      return null;
    }
  }

  search(form: NgForm) {
    this.logger.debug("check the form on search", form.valid);
    this.logger.debug(form, form.form.value);
    if (form.valid) {
      this.searchFilter = {};
      Object.assign(this.searchFilter, form.form.value);
      this.searchModel.setSearchCriteria(this.searchType, this.searchFilter)

      const sf: SearchCriteria = {}
      Object.assign(sf, form.form.value);
      sf.searchType = this.searchType;
      if (this.searchType === 'FR') {
        sf.pendingApprovalStatusOnly = this.searchFilter.fundingRequestStatus?.length === 1 && this.searchFilter.fundingRequestStatus[0] === 'PENDING APPROVAL';
      }
      else if ((this.searchType === 'FP')) {
        sf.pendingApprovalStatusOnly = this.searchFilter.fundingPlanStatus?.length === 1 && this.searchFilter.fundingPlanStatus[0] === 'PENDING APPROVAL';
      }
      sf.fundingRequestStatus = this._populateStatus(this.searchFilter.fundingRequestStatus);
      sf.fundingPlanStatus = this._populateStatus(this.searchFilter.fundingPlanStatus);
      this.logger.debug('search criteria:', sf);
      this.callSearch.emit(sf);
    }
  }

  private _populateStatus(formStatuses: string[]): string[] {
    const rss = [];
    if (formStatuses) {
      for (const s of formStatuses) {
        if (s === 'PENDING APPROVAL') {
          for (const rsl of this.requestStatusList) {
            if (rsl.id === s) {
              rss.push.apply(rss, rsl.additional);
              break;
            }
          }
        }
        else {
          rss.push(s);
        }
      }
    }
    return rss;
  }


 private _containsAdvancedInSearchFilter(sf: SearchCriteria): boolean {
    return (sf != null &&
      ((sf.requestingPd && sf.requestingPd !== '') ||
       (sf.requestingDoc && sf.requestingDoc !== '') ||
       (sf.fundingSources && sf.fundingSources !== '') ||
       (sf.id && sf.id !== '') ||
       (sf.piName && sf.piName !== '') ||
       (sf.institutionName && sf.institutionName !== '') ||
       (sf.pdName && sf.pdName !== '') ||
       (sf.doc && sf.doc !== '')
      ));
  }

  // Check if at least one criteria selected or both IC and Serial Number
  validFilter(): boolean {
    const formValue = this.searchForm?.form.value;
    if (!formValue) {
      return true;
    }

    // Both IC and Serial Number are entered
    if (formValue.grantNumber?.grantNumberIC && formValue.grantNumber?.grantNumberSerial) {
      return true;
    }

    const commonAll: boolean = formValue.fyRange?.fromFy || formValue.fyRange?.toFy || formValue.piName;

    const commonFrFp: boolean = formValue.requestingPd || formValue.requestingDoc ||
                                formValue.fundingSources || formValue.id ||
                                formValue.institutionName ||
                                formValue.pdName || formValue.doc

    if (this.searchType === 'FR' &&
       (commonAll || commonFrFp ||
        (formValue.frTypes && formValue.frTypes.length > 0) ||
        (formValue.fundingRequestStatus && formValue.fundingRequestStatus.length > 0)
        )) {
      return true;
    }

    if (this.searchType === 'FP' &&
        (commonAll || commonFrFp ||
        (formValue.fundingPlanStatus && formValue.fundingPlanStatus.length > 0) ||
        formValue.rfaPa ||
        formValue.ncabRange?.fromNcab || formValue.ncabRange?.toNcab
        )) {
      return true;
    }

    if (this.searchType === 'G' &&
        (commonAll ||
         formValue.i2status
        )) {
      return true;
    }
    return false;
  }
}
