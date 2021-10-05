import {Component, OnInit, Output, ViewChild, EventEmitter, AfterViewInit} from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import { FundSelectSearchCriteria } from '@nci-cbiit/i2ecws-lib';
import { SearchCriteria } from '../search-criteria';
import { NGXLogger } from 'ngx-logger';
import {AppUserSessionService} from "../../service/app-user-session.service";
import {NgForm} from "@angular/forms";
import {Select2OptionData} from "ng-select2";
import {Options} from "select2";
import {SearchModel} from "../model/search-model";

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css']
})
export class SearchFilterComponent implements OnInit, AfterViewInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
  @ViewChild('searchForm') searchForm: NgForm;

  @Output() callSearch = new EventEmitter<SearchCriteria>();
  @Output() searchTypeEm = new EventEmitter<string>()
  public searchFilter: SearchCriteria;

  showAdvanced: boolean = false;

  canSearchForPaylists: boolean;

  private _searchType: string = 'FR';

  set searchType(value: string) {
    this._searchType = value;
    this.searchTypeEm.emit(value);
  }
  get searchType() { return this._searchType; }

  constructor(private userSessionService: AppUserSessionService,
              private searchModel: SearchModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.searchType = this.searchModel.searchType;
    this.searchFilter = this.searchModel.searchCriteria;
    this.canSearchForPaylists = this.userSessionService.hasRole('GMBRCHF') ||
                                this.userSessionService.hasRole('OEFIACRT');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.searchForm.form.patchValue(this.searchFilter);
    }, 0);
  }

  fyRange: any = {};
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

  clear() {
   this.searchFilter = {};
   this.searchForm.resetForm();
  }

  search(form: NgForm) {
    this.logger.debug("check the form on search", form.valid);
    this.logger.debug(form, form.form.value);
    if (form.valid) {
      this.searchFilter = {};
      Object.assign(this.searchFilter, form.form.value);
      this.searchModel.searchCriteria = this.searchFilter;
      this.searchModel.searchType = this.searchType;

      const sf: SearchCriteria = {}
      Object.assign(sf, form.form.value);
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
}
