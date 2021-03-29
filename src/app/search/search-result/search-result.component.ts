import { Component, OnInit } from '@angular/core';
import { FundSelectSearchCriteria, FsControllerService, FundingRequestQueryDto, BASE_PATH } from 'i2ecws-lib';
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
   persons: FundingRequestQueryDto[];
   userData:any;

   searchResult;

  constructor(private fsControllerService: FsControllerService,
    private http: HttpClient ) { }

  ngOnInit(): void {


    

    this.userData = { fyFrom : '2019' };
        this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 2,
      serverSide: true,
      processing: true,
      ajax: (dataTablesParameters: any, callback) => {
        this.http
          .post<DataTablesResponse>(
           'i2ecws/api/v1/fs/search-funding-requests',
            Object.assign(dataTablesParameters,this.userData),{}
          ).subscribe(resp => {
            this.persons = resp.data;

            callback({
              recordsTotal: resp.recordsTotal,
              recordsFiltered: resp.recordsFiltered,
              data: []
            });
          });
      },
      columns: [{ data: 'fullGrantNum' }, { data: 'piFullName' }, { data: 'orgName' }]
    };

  }

  doSearch(criteria:FundSelectSearchCriteria) {
    console.log("search-result.component doSearch Called");
    this.userData = { fyFrom : criteria.fyFrom };


    

    // this.fsControllerService.searchFundingRequestsUsingPOST(criteria).subscribe(
    //   result => {
    //     console.log('searchPaylinePaylistGrantsUsingPOST1 returned ', result);
    //     this.searchResult = result;
    //   },error => {
    //     console.log( 'HttpClient get request error for----- '+ error.message);
    //   });
  }
}
