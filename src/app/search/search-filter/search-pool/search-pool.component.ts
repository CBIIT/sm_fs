import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {LookupsControllerService} from '@nci-cbiit/i2ecws-lib';
import 'select2';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import {SearchFilterService} from '../../search-filter.service';

@Component({
  selector: 'app-search-pool',
  templateUrl: './search-pool.component.html',
  styleUrls: ['./search-pool.component.css']
})
export class SearchPoolComponent implements OnInit {

  public searchPools: { key: string, value: string }[];

  @Output() valueChanged=new EventEmitter<string>();
  @Input("initValue") _value:string;
  @Input() grantSearch:boolean=false;

  constructor(private appUserSessionService:AppUserSessionService) {
  }

  get value(): string {
    return this._value;
  }
  set value(value: string) {
    console.log('search-pool set value: ' + value);
    this._value = value;
    this.valueChanged.emit(value);
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

