import {Component, OnInit, Input, Output, EventEmitter, Inject} from '@angular/core';
import {FsLookupControllerService} from '@nci-cbiit/i2ecws-lib';
import 'select2';
import {SearchFilterService} from '../search/search-filter.service';
import {UserService} from '@nci-cbiit/i2ecui-lib';
import {RequestModel} from '../model/request-model';


@Component({
  selector: 'app-funding-request-type',
  templateUrl: './funding-request-type.component.html',
  styleUrls: ['./funding-request-type.component.css']
})
export class FundingRequestTypeComponent implements OnInit {
  @Input() filter: boolean;
  public requestTypes: { id?: number, requestName?: string }[] = [];
  public searchFilter:
    { requestOrPlan: string; searchPool: string; requestType: string; }
    = {requestOrPlan: '', searchPool: '', requestType: ''};

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();

  set selectedValue(value: number) {
    console.log('request type selectedValue setter called ', value);
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
    this.searchFilter.requestType = String(value);
  }

  private _selectedValue: number;

  constructor(private fsLookupControllerService: FsLookupControllerService,
              private searchFilterService: SearchFilterService,
              private userService: UserService,
              private model: RequestModel) {
  }

  ngOnInit(): void {
    console.log('filter =', this.filter);
    this.searchFilter = this.searchFilterService.searchFilter;

    this.evoke(this.filter).subscribe(
      result => {
        console.log('getRequestTypes returned ', result);
        if (this.filter) {
          this.requestTypes = result.fundingRequestTypeRulesDtoList;
        } else {
          this.requestTypes = result;
        }
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
    console.log('funding-request-type component ngOnInit()');
  }

  evoke(filter): any {
    if (filter) {
      return this.fsLookupControllerService.getRequestTypesWithFlagUsingGET(this.model.grant.fullGrantNum,
        this.userService.currentUserValue.npnId);
    } else {
      return this.fsLookupControllerService.getRequestTypesUsingGET();
    }
  }

  onChange(event): any {
    console.log('change', event);
  }

}
