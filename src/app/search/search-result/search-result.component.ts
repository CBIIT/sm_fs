import { Component, OnInit } from '@angular/core';
import { FundSelectSearchCriteria, FsControllerService } from 'i2ecws-lib';

@Component({
  selector: 'app-search-result',
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.css']
})
export class SearchResultComponent implements OnInit {

  searchResult;

  constructor(private fsControllerService: FsControllerService ) { }

  ngOnInit(): void {
  }

  doSearch(criteria:FundSelectSearchCriteria) {
    console.log("search-result.component doSearch Called");
    this.fsControllerService.searchFundingRequestsUsingPOST(criteria).subscribe(
      result => {
        console.log('searchPaylinePaylistGrantsUsingPOST1 returned ', result);
        this.searchResult = result;
      },error => {
        console.log( 'HttpClient get request error for----- '+ error.message);
      });
  }
}
