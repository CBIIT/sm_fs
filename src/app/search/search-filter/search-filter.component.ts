import { Component, OnInit, ViewChild } from '@angular/core';
import { GrantnumberSearchCriteriaComponent } from 'i2ecui-lib';
import { SearchFilterService } from '../search-filter.service';

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css'],
  providers: [SearchFilterService]
})
export class SearchFilterComponent implements OnInit {
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
  
  public searchFilter: 
  { requestOrPlan: string; searchPool: string; requestType: string; 
    rfaPa:string; fyRange:any, grantNumber:string} 
  = { requestOrPlan: '', 
      searchPool: '', 
      requestType: '', 
      rfaPa:'', 
      fyRange: {},
      grantNumber:''
     };


  constructor(private searchFilterService:SearchFilterService) {}

  ngOnInit(): void {
    console.log("search-filter component ngOnInit()");
    this.searchFilter=this.searchFilterService.searchFilter;
  }

  rfaPaSelected(event:string) {
    this.searchFilter.rfaPa=event;
  }

  fyRangeChanged(event:{}) {
    this.searchFilter.fyRange=event;
  }




}
