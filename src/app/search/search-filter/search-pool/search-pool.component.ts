import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import 'select2';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-search-pool',
  templateUrl: './search-pool.component.html',
  styleUrls: ['./search-pool.component.css']
})
export class SearchPoolComponent implements OnInit {

  public searchPools: { key: string, value: string }[];

  @Input() grantSearch = false;

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  set selectedValue(value: string) {
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue = '';

  constructor(private appUserSessionService: AppUserSessionService, private logger: NGXLogger) {
  }


  ngOnInit(): void {
    const myCA = this.appUserSessionService.getUserCaAsString();

    const myCAText = (myCA) ? 'My Cancer Activities' + ' (' + myCA + ')' : 'My Cancer Activities';

    if (this.grantSearch) {
      this.searchPools = [];
      if (this.appUserSessionService.isPD()) {
        this.searchPools.push({ key: 'mypf', value: 'My Portfolio' });
      }

      if (myCA) {
        this.searchPools.push({ key: 'myca', value: myCAText });
      }
    } else if (this.appUserSessionService.isProgramStaff()) {
      this.searchPools = [{ key: 'myca', value: myCAText },
      { key: 'mypf', value: 'My Portfolio' },
      { key: 'myrq', value: 'My Requests' },
      { key: 'myrqur', value: 'My Requests Under Review' },
      { key: 'rqawme', value: 'Requests Awaiting My Response' }];
    } else {
      this.searchPools = [{ key: 'rqawme', value: 'Requests Awaiting My Response' }];
    }
  }


}

