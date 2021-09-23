import { Component, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import { FundSelectSearchCriteriaRes } from '@nci-cbiit/i2ecws-lib';
import { SearchCriteria } from '../search-criteria';
import { NGXLogger } from 'ngx-logger';
import {AppUserSessionService} from "../../service/app-user-session.service";
import {NgForm} from "@angular/forms";
import {Select2OptionData} from "ng-select2";
import {Options} from "select2";

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css']
})
export class SearchFilterComponent implements OnInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
  @ViewChild('searchForm') searchForm: NgForm;

  @Output() callSearch = new EventEmitter<SearchCriteria>();
  @Output() searchType = new EventEmitter<string>()
  public searchFilter: SearchCriteria;

  showAdvanced: boolean = false;

  canSearchForPaylists: boolean;

  private _typeSearch: string = 'FR';

  set typeSearch(value: string) {
    this._typeSearch = value;
    this.searchType.emit(value);
  }
  get typeSearch() { return this._typeSearch; }

  constructor(private userSessionService: AppUserSessionService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.typeSearch = 'FR';
    this.canSearchForPaylists = this.userSessionService.hasRole('GMBRCHF') ||
                                this.userSessionService.hasRole('OEFIACRT');
  }


  // TODO: this method is apparently unused.  Can it be deleted?
  typeSearchModel: any = '0';
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
  /*
  APPROVED
  AWC
  CANCELLED
  COMPLETED
  DEFER
  DELEGATED
  DRAFT
  ON HOLD
  REASSIGNED
  REJECTED
  RELEASED
  RFC
  ROUTED
  SUBMITTED
  WITHDRAWN
   */
  requestStatusOptions: Options = {
    multiple: true,
    allowClear: true
  };

  doSearch(): void {
    this.logger.debug('Search Filter: ', this.searchFilter);
    this.callSearch.emit(this.searchFilter);
  }

  clear() {

  }

  search() {
    this.logger.debug("check the form on search", this.searchForm.valid);
    this.logger.debug(this.searchForm);
    if (this.searchForm.valid) {
      const sc: SearchCriteria = {};
      Object.assign(sc, this.searchForm.form.value);
      sc.fundingRequestStatus = this._populateRequestStatus(sc.fundingRequestStatus);
      this.logger.debug('search criteria:', sc);
      this.callSearch.emit(sc);
    }
  }

  private _populateRequestStatus(formStatuses: string[]): string[] {
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
