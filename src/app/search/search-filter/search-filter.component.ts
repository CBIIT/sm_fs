import { Component, OnInit } from '@angular/core';
import { SearchFilterService } from '../search-filter.service';

@Component({
  selector: 'app-search-filter',
  templateUrl: './search-filter.component.html',
  styleUrls: ['./search-filter.component.css'],
  providers: [SearchFilterService]
})
export class SearchFilterComponent implements OnInit {

  public searchFilter: 
  { requestOrPlan: string; searchPool: string; requestType: string; } 
  = { requestOrPlan: '', searchPool: '', requestType: '' };

  constructor(private searchFilterService:SearchFilterService) {}

  ngOnInit(): void {
    console.log("search-filter component ngOnInit()");
    this.searchFilter=this.searchFilterService.searchFilter;
  }

}
