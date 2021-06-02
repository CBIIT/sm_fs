import { Component, OnInit } from '@angular/core';
import { FundSelectSearchCriteriaRes, FsSearchControllerService, FundingRequestQueryDatatableDto, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

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

  constructor(private fsSearchControllerService: FsSearchControllerService, private logger: NGXLogger) { }

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
            this.logger.debug('Search Funding Requests result: ', result);
            this.fundingRequests = result.data;
            callback({
              recordsTotal: result.recordsTotal,
              recordsFiltered: result.recordsFiltered,
              data: []
            });
          }, error => {
            this.logger.error('HttpClient get request error for----- ' + error.message);
          });

      },
      columns: [{ data: 'fullGrantNum' }, { data: 'piFullName' }, { data: 'orgName' }]
    };

  }

  doSearch(criteria: FundSelectSearchCriteriaRes) {
    this.userData = { fyFrom: criteria.fyFrom };
  }
}
