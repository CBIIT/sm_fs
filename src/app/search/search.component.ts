import { Component, OnInit, ViewChild } from '@angular/core';
import { SearchCriteria } from './search-criteria';
import { SearchResultComponent } from './search-result/search-result.component';
import { FundSelectSearchCriteria } from 'i2ecws-lib';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  @ViewChild(SearchResultComponent) searchResultComponent: SearchResultComponent;

  constructor() { }

  ngOnInit(): void {
  }

  doSearch(event:SearchCriteria) {
    console.log("search.component doSearch Called");
    let fsCritera:FundSelectSearchCriteria={};
    fsCritera.fyFrom=event.fyRange.fromFy;
    fsCritera.fyTo=event.fyRange.toFy;
    fsCritera.requestType=[event.requestType];
    fsCritera.rfaPaNumber=[event.rfaPa];
    
    this.searchResultComponent.doSearch(fsCritera);

  }

}
