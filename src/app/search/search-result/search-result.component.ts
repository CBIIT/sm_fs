import { Component, OnInit } from '@angular/core';
import { FundSelectSearchCriteria, PfrControllerService } from 'i2ecws-lib';

@Component({
  selector: 'app-search-result',
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.css']
})
export class SearchResultComponent implements OnInit {

  searchResult;

  constructor(private pfrControllerService: PfrControllerService ) { }

  ngOnInit(): void {
  }

  doSearch(criteria:FundSelectSearchCriteria) {
    console.log("search-result.component doSearch Called");
    this.pfrControllerService.searchPaylinePaylistGrantsUsingPOST1(criteria).subscribe(
      result => {
        console.log('searchPaylinePaylistGrantsUsingPOST1 returned ', result);
        this.searchResult = result;
      },error => {
        console.log( 'HttpClient get request error for----- '+ error.message);
      });
  }
}
