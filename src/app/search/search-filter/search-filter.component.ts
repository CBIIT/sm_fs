import { Component, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import { FundSelectSearchCriteriaRes } from '@nci-cbiit/i2ecws-lib';
import { SearchCriteria } from '../search-criteria';
import { SearchFilterService } from '../search-filter.service';
import { NGXLogger } from 'ngx-logger';
import {AppUserSessionService} from "../../service/app-user-session.service";

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css'],
  providers: [SearchFilterService]
})
export class SearchFilterComponent implements OnInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
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

  constructor(private searchFilterService: SearchFilterService,
              private userSessionService: AppUserSessionService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.typeSearch = 'FR';
    this.canSearchForPaylists = this.userSessionService.hasRole('GMBRCHF') ||
                                this.userSessionService.hasRole('OEFIACRT');
    this.searchFilter = this.searchFilterService.searchFilter;
  }

  // TODO: this method is apparently unused.  Can it be deleted?
  rfaPaSelected(event: string): void {
    this.searchFilter.rfaPa = event;
  }

  // TODO: this method is apparently unused.  Can it be deleted?
  typeSearchModel: any = '0';
  fyRange: any = {};
  //TODO - get this list from the server
  requestTypeList: [];

  fyRangeChanged(event: { fromFy: number, toFy: number }): void {
    this.searchFilter.fyRange = event;
  }

  isSearchingRequest(): boolean {
    return this.searchFilter.requestOrPlan === 'Request';
  }

  doSearch(): void {
    this.logger.debug('Search Filter: ', this.searchFilter);
    this.callSearch.emit(this.searchFilter);
  }

  clear() {

  }

  search() {

  }
}
