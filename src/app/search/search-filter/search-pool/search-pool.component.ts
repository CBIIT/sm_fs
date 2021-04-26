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

  constructor(private appUserSessionService:AppUserSessionService) {
  }

  ngOnInit(): void {
    console.log('search-pool component ngOnInit()');
    if (this.appUserSessionService.isPD()) 
      this.searchPools=[{key: 'myca',   value: 'My Cancer Activities' },
                        {key: 'mypf',   value: 'My Portfolio' },
                        {key: 'myrq',   value: 'My Requests' },
                        {key: 'myrqur', value: 'My Requests Under Review' },
                        {key: 'rqawme', value: 'Requests Awaiting My Response' }];
    else 
      this.searchPools=[{key: 'rqawme', value: 'Requests Awaiting My Response' }];
  }
}

