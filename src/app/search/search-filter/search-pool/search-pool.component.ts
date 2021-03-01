import { Component, OnInit , Input , Output , EventEmitter } from '@angular/core';
import { LookupsControllerService } from 'i2ecws-lib';
import 'select2';
import { SearchFilterService } from '../../search-filter.service';

@Component({
  selector: 'app-search-pool',
  templateUrl: './search-pool.component.html',
  styleUrls: ['./search-pool.component.css']
})
export class SearchPoolComponent implements OnInit {

    public searchPools: {key:string, value:string}[]=[];
    public searchFilter: 
    { requestOrPlan: string; searchPool: string; requestType: string; } 
    = { requestOrPlan: '', searchPool: '', requestType: '' };
  
  
    constructor(private lookupsControllerService : LookupsControllerService,
      private searchFilterService:SearchFilterService) { }
   
    // set selectedSearchPool(selectedValue: string) {
    //   this._select = selectedValue;
    //   console.log(selectedValue);
    //   this.searchPoolSelected.emit(this._select);
    // }
    ngOnInit(): void {
      // this.lookupsControllerService.getNciDocsUsingGET().subscribe(
      //   result => {
      //     console.log('Getting the Doc Dropdown results');
      //     this.docs = result;
      //   },error => {
      //     console.log( 'HttpClient get request error for----- '+ error.message);
      //   });
      console.log("search-pool component ngOnInit()");

      this.searchFilter=this.searchFilterService.searchFilter;

      this.searchPools.push({
        "key":'myca',
        "value":"My Cancer Activities"
      });
      this.searchPools.push({
        "key":'mypf',
        "value":"My Portfolio"
      });
      this.searchPools.push({
        "key":'myrq',
        "value":"My Requests"
      });
      this.searchPools.push({
        "key":'myrqur',
        "value":"My Requests Under Review"
      });
      this.searchPools.push({
        "key":'rqawme',
        "value":"Requests Awaiting My Response"
      });
  
    }
  
    }
  
