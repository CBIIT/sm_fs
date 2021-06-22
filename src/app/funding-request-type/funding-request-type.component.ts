import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FsLookupControllerService} from '@nci-cbiit/i2ecws-lib';
import 'select2';
import {SearchFilterService} from '../search/search-filter.service';
import {UserService} from '@nci-cbiit/i2ecui-lib';
import {RequestModel} from '../model/request-model';
import {openNewWindow} from 'src/app/utils/utils';
import {NGXLogger} from 'ngx-logger';
import {Select2OptionData} from 'ng-select2';
import {FundingRequestTypeRulesDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestTypeRulesDto';
import {FundingRequestTypes} from '../model/funding-request-types';
import {Alert} from '../alert-billboard/alert';


@Component({
  selector: 'app-funding-request-type',
  templateUrl: './funding-request-type.component.html',
  styleUrls: ['./funding-request-type.component.css']
})
export class FundingRequestTypeComponent implements OnInit {
  @Input() filter: boolean;
  alerts: Alert[] = [];
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
  alert: Alert = {
    type: 'warning',
    message: 'WARNING: This option should be selected only if your request will not be using any NCI funds. Are you sure you want to continue?'
  };

  set selectedValue(value: number) {
    if (value && Number(value) === FundingRequestTypes.OTHER_PAY_COMPETING_ONLY) {
      this.alerts.push(this.alert);
    } else {
      this.alerts.splice(this.alerts.indexOf(this.alert), 1);
    }
    this.model.requestDto.frtId = value;
    this.model.requestDto.financialInfoDto.requestTypeId = value;
    this.model.programRecommendedCostsModel.fundingRequestType = value;
    const valueChanged = this._selectedValue && (value !== this._selectedValue);

    this._selectedValue = value;
    this.selectedValueChange.emit(value);
    this.searchFilter.requestType = String(value);
    this.model.requestDto.frtId = value;
    this.model.requestDto.financialInfoDto.requestTypeId = value;
    this.model.programRecommendedCostsModel.fundingRequestType = value;
    if (valueChanged) {
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
    this.searchFilter = this.searchFilterService.searchFilter;

    this.evoke(this.filter).subscribe(
      result => {
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
