import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import 'select2';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { __values } from 'tslib';

@Component({
  selector: 'app-search-pool',
  templateUrl: './search-pool.component.html',
  styleUrls: ['./search-pool.component.css']
})
export class SearchPoolComponent implements OnInit {

  public searchPools: { key: string, value: string }[];

  @Input() grantSearch:boolean=false;
  
  @Input() 
  get searchWithin():string {
    return this._value;
  }

  @Output() searchWithinChange=new EventEmitter<string>();

  set searchWithin(value:string) {
    this._value=value;
    this.searchWithinChange.emit(value);
  }



  _value:string;

  constructor(private appUserSessionService:AppUserSessionService) {
  }

  ngOnInit(): void {
    console.log('search-pool component ngOnInit()');
    if (this.grantSearch)
      this.searchPools=[{key: 'myca',   value: 'My Cancer Activities' },
      {key: 'mypf',   value: 'My Portfolio' }];

    else if (this.appUserSessionService.isPD()) 
      this.searchPools=[{key: 'myca',   value: 'My Cancer Activities' },
                        {key: 'mypf',   value: 'My Portfolio' },
                        {key: 'myrq',   value: 'My Requests' },
                        {key: 'myrqur', value: 'My Requests Under Review' },
                        {key: 'rqwme', value: 'Requests Awaiting My Response' }];
    else 
      this.searchPools=[{key: 'rqwme', value: 'Requests Awaiting My Response' }];
  }


}

