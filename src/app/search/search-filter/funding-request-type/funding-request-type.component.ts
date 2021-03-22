import { Component, OnInit , Input , Output , EventEmitter } from '@angular/core';
import { FsLookupControllerService } from 'i2ecws-lib';
import 'select2';
import { SearchFilterService } from '../../search-filter.service';


@Component({
  selector: 'app-funding-request-type',
  templateUrl: './funding-request-type.component.html',
  styleUrls: ['./funding-request-type.component.css']
})
export class FundingRequestTypeComponent implements OnInit {
  public requestTypes: {id:number, requestName:string}[]=[];
  public searchFilter: 
  { requestOrPlan: string; searchPool: string; requestType: string; } 
  = { requestOrPlan: '', searchPool: '', requestType: '' };

  constructor(private fsLookupControllerService : FsLookupControllerService,
    private searchFilterService:SearchFilterService) { }
 
  // set selectedRequestType(selectedValue: string) {
  //   this._selectRequestType = selectedValue;
  //   console.log(selectedValue);
  //   this.requestTypeSelected.emit(this._selectRequestType);
  // }
  ngOnInit(): void {
    this.fsLookupControllerService.getRequestTypesUsingGET().subscribe(
      result => {
        console.log('getRequestTypes returned ', result);
        this.requestTypes = result;
      },error => {
        console.log( 'HttpClient get request error for----- '+ error.message);
      });
    console.log("funding-request-type component ngOnInit()");

    this.searchFilter=this.searchFilterService.searchFilter;
    
    // this.requestTypes.push({
    //   "key":1018,
    //   "value":"Co-Fund a Non-NCI Non-Competing Grant"
    // });
    // this.requestTypes.push({
    //   "key":27,
    //   "value":"Co-fund a Non-NCI Competing Application"
    // });
    // this.requestTypes.push({
    //   "key":1000,
    //   "value":"Diversity Supplement (includes CURE Supplements)"
    // });
    // this.requestTypes.push({
    //   "key":25,
    //   "value":"Early Pay"
    // });
    // this.requestTypes.push({
    //   "key":9,
    //   "value":"General Administrative Supplements/Adjustment (Post-Award)"
    // });

  }

  }
