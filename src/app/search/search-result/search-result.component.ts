import { Component, OnInit } from '@angular/core';
import { FundSelectSearchCriteriaRes, FsSearchControllerService , FundingRequestQueryDatatableDto, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { HttpClient, HttpResponse } from '@angular/common/http';

class DataTablesResponse {
  data: any[];
  draw: number;
  recordsFiltered: number;
  recordsTotal: number;
}

@Component({
  selector: 'app-search-result',
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.css']
})
export class SearchResultComponent implements OnInit {

  dtOptions: DataTables.Settings = {};
  fundingRequests: FundingRequestQueryDto[];
  userData: any;
  params: any;

  searchResult;

  constructor(private fsSearchControllerService: FsSearchControllerService) { }

  ngOnInit(): void {

    this.userData = { fyFrom: '2019' };
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: true,
      processing: true,

      ajax: (dataTablesParameters: any, callback) => {

        this.fsSearchControllerService.searchFundingRequestsUsingPOST(Object.assign(dataTablesParameters, this.userData)).subscribe(
          result => {
            console.log('searchPaylinePaylistGrantsUsingPOST1 returned ', result);
            this.fundingRequests = result.data;
            callback({
              recordsTotal: result.recordsTotal,
              recordsFiltered: result.recordsFiltered,
              data: []
            });
          }, error => {
            console.log('HttpClient get request error for----- ' + error.message);
          });

      },
      columns: [{ data: 'fullGrantNum' }, { data: 'piFullName' }, { data: 'orgName' }]
    };

  }

  doSearch(criteria: FundSelectSearchCriteriaRes) {
    console.log("search-result.component doSearch Called");
    this.userData = { fyFrom: criteria.fyFrom };
  }
}
