import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {FsLookupControllerService} from '@nci-cbiit/i2ecws-lib';
import 'select2';
import {SearchFilterService} from '../../search-filter.service';


@Component({
  selector: 'app-funding-request-type',
  templateUrl: './funding-request-type.component.html',
  styleUrls: ['./funding-request-type.component.css']
})
export class FundingRequestTypeComponent implements OnInit {
  public requestTypes: { id?: number, requestName?: string }[] = [];
  public searchFilter:
    { requestOrPlan: string; searchPool: string; requestType: string; grantNumber: string; npnId: number }
    = {requestOrPlan: '', searchPool: '', requestType: '', grantNumber: '', npnId: undefined};

  constructor(private fsLookupControllerService: FsLookupControllerService,
              private searchFilterService: SearchFilterService) {
  }

  ngOnInit(): void {
    this.fsLookupControllerService.getRequestTypesWithFlagUsingGET(this.searchFilter.grantNumber, this.searchFilter.npnId).subscribe(
      result => {
        console.log('getRequestTypes returned ', result);
        this.requestTypes = result.fundingRequestTypeRulesDtoList;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
    console.log('funding-request-type component ngOnInit()');

    this.searchFilter = this.searchFilterService.searchFilter;

  }

}
