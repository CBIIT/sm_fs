import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import 'select2';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Component({
  selector: 'app-search-pool',
  templateUrl: './search-pool.component.html',
  styleUrls: ['./search-pool.component.css']
})
export class SearchPoolComponent implements OnInit {

  public searchPools: { key: string, value: string }[];

  @Input() grantSearch:boolean=false;

  @Input() 
  get selectedValue():string {
    return this._selectedValue;
  }

  @Output() selectedValueChange=new EventEmitter<string>();

  set selectedValue(value:string) {
    console.log("search pool selectedValue setter called ",value);
    this._selectedValue=value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue: string = '';

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
                        {key: 'rqawme', value: 'Requests Awaiting My Response' }];
    else 
      this.searchPools=[{key: 'rqawme', value: 'Requests Awaiting My Response' }];
  }


}

