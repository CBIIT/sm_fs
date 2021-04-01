import { Component, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import { FundSelectSearchCriteria } from '@nci-cbiit/i2ecws-lib';
import { SearchCriteria } from '../search-criteria';
import { SearchFilterService } from '../search-filter.service';

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css'],
  providers: [SearchFilterService]
})
export class SearchFilterComponent implements OnInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
  @Output() callSearch=new EventEmitter<SearchCriteria>();
  public searchFilter: SearchCriteria;

  constructor(private searchFilterService:SearchFilterService) {}

  ngOnInit(): void {
    console.log("search-filter component ngOnInit()");
    this.searchFilter=this.searchFilterService.searchFilter;
  }

  rfaPaSelected(event:string) {
    this.searchFilter.rfaPa=event;
  }

  fyRangeChanged(event:{fromFy:number,toFy:number}) {
    this.searchFilter.fyRange=event;
  }

  isSearchingRequest():boolean {
    return this.searchFilter.requestOrPlan==='Request';
  }

  doSearch() {
    console.log("search-filter.component doSearch Called");
    this.callSearch.emit(this.searchFilter);
  }

}
