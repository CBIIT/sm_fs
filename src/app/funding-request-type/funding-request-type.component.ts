import {Component, OnInit, Input, Output, EventEmitter, Inject} from '@angular/core';
import {FsLookupControllerService} from '@nci-cbiit/i2ecws-lib';
import 'select2';
import {SearchFilterService} from '../search/search-filter.service';
import {UserService} from '@nci-cbiit/i2ecui-lib';
import {RequestModel} from '../model/request-model';
import {openNewWindow} from 'src/app/utils/utils';
import {NGXLogger} from 'ngx-logger';


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
    // console.log('request type selectedValue setter called ', value);
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
    this.searchFilter.requestType = String(value);
  }

  private _selectedValue: number;

  constructor(private fsLookupControllerService: FsLookupControllerService,
              private searchFilterService: SearchFilterService,
              private userService: UserService,
              private model: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    // console.log('filter =', this.filter);
    this.searchFilter = this.searchFilterService.searchFilter;

    this.evoke(this.filter).subscribe(
      result => {
        // console.log('getRequestTypes returned ', result);
        if (this.filter) {
          this.requestTypes = result.fundingRequestTypeRulesDtoList;
        } else {
          this.requestTypes = result;
        }
        // TODO: this is a hack. Make sure we understand how to properly restore the funding request type
        this.logger.debug('Restoring selected type ID:', this.model.requestDto.financialInfoDto.requestTypeId);
        if (this.model.requestDto.financialInfoDto.requestTypeId) {
          this.logger.debug('Restoring selected type ID:', this.model.requestDto.financialInfoDto.requestTypeId);
          this.selectedValue = this.model.requestDto.financialInfoDto.requestTypeId;
        }
      }, error => {
        console.error('HttpClient get request error for----- ' + error.message);
      });
  }

  evoke(filter): any {
    if (filter) {
      return this.fsLookupControllerService.getRequestTypesWithFlagUsingGET(this.model.grant.fullGrantNum,
        this.userService.currentUserValue.npnId);
    } else {
      return this.fsLookupControllerService.getRequestTypesUsingGET();
    }
  }

  openPdfDoc(): boolean {
    openNewWindow('assets/docs/PFR-Request-type-definitions.pdf', 'Request_Type_Description');
    return false;
  }

}
