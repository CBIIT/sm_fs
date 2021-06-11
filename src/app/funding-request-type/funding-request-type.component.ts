import {Component, OnInit, Input, Output, EventEmitter, Inject} from '@angular/core';
import {FsLookupControllerService} from '@nci-cbiit/i2ecws-lib';
import 'select2';
import {SearchFilterService} from '../search/search-filter.service';
import {UserService} from '@nci-cbiit/i2ecui-lib';
import {RequestModel} from '../model/request-model';
import {openNewWindow} from 'src/app/utils/utils';
import {NGXLogger} from 'ngx-logger';
import {Select2OptionData} from 'ng-select2';
import {FundingRequestTypeRulesDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestTypeRulesDto';


@Component({
  selector: 'app-funding-request-type',
  templateUrl: './funding-request-type.component.html',
  styleUrls: ['./funding-request-type.component.css']
})
export class FundingRequestTypeComponent implements OnInit {
  @Input() filter: boolean;
  public requestTypes: FundingRequestTypeRulesDto[] = [];
  public searchFilter:
    { requestOrPlan: string; searchPool: string; requestType: string; }
    = {requestOrPlan: '', searchPool: '', requestType: ''};
  data: Array<Select2OptionData>;
  private _selectedValue: number;

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();

  set selectedValue(value: number) {
    this.logger.debug('funding-request-type-component sets new value of', value);
    this.model.requestDto.frtId = value;
    this.model.requestDto.financialInfoDto.requestTypeId = value;
    this.model.programRecommendedCostsModel.fundingRequestType = value;
    const valueChanged = this._selectedValue && (value !== this._selectedValue);
    if (valueChanged) {
      this.logger.debug('Request type changed from', this._selectedValue, 'to', value);
    }
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
    this.searchFilter.requestType = String(value);
    this.model.requestDto.frtId = value;
    this.model.requestDto.financialInfoDto.requestTypeId = value;
    this.model.programRecommendedCostsModel.fundingRequestType = value;
    if (valueChanged) {
      this.logger.debug('Reset PRC model');
      this.model.programRecommendedCostsModel.reset();
    }
  }

  constructor(private fsLookupControllerService: FsLookupControllerService,
              private searchFilterService: SearchFilterService,
              private userService: UserService,
              private model: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug('init request types');
    this.searchFilter = this.searchFilterService.searchFilter;

    this.evoke(this.filter).subscribe(
      result => {
        // this.logger.debug('Request Types results: ', result);
        if (this.filter) {
          this.requestTypes = result.fundingRequestTypeRulesDtoList;
        } else {
          this.requestTypes = result;
        }
        this.prepareData(this.requestTypes);
        if (this.model.requestDto.financialInfoDto.requestTypeId) {
          this.selectedValue = this.model.requestDto.financialInfoDto.requestTypeId;
        }
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  prepareData(list: FundingRequestTypeRulesDto[]): void {
    // this.logger.debug('Preparing funding type data');
    const results = new Array<Select2OptionData>();
    const children = new Map<number, Select2OptionData[]>();
    let tmp: Select2OptionData;
    list.forEach(t => {
      tmp = {
        id: String(t.id),
        text: t.requestName,
        children: undefined,
        disabled: false,
      };
      if (!(t.parentFrtId)) {
        results.push(tmp);
        const c = children.get(t.id);
        if (!c) {
          children.set(t.id, new Array<Select2OptionData>());
        }
      } else {
        const c = children.get(t.parentFrtId);
        if (!c) {
          children.set(t.parentFrtId, [tmp]);
        } else {
          c.push(tmp);
        }
      }
    });
    results.forEach(r => {
      const c = children.get(Number(r.id));
      if (c && c.length > 0) {
        r.children = c;
      }
    });
    // this.logger.debug(results);
    this.data = results;
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
