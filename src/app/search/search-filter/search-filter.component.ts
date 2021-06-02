import { Component, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import { FundSelectSearchCriteriaRes } from '@nci-cbiit/i2ecws-lib';
import { SearchCriteria } from '../search-criteria';
import { SearchFilterService } from '../search-filter.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css'],
  providers: [SearchFilterService]
})
export class SearchFilterComponent implements OnInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
  @Output() callSearch = new EventEmitter<SearchCriteria>();
  public searchFilter: SearchCriteria;

  constructor(private searchFilterService: SearchFilterService, private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.searchFilter = this.searchFilterService.searchFilter;
  }

  // TODO: this method is apparently unused.  Can it be deleted?
  rfaPaSelected(event: string): void {
    this.searchFilter.rfaPa = event;
  }

  // TODO: this method is apparently unused.  Can it be deleted?
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

}
