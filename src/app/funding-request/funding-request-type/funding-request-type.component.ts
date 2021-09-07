import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FsLookupControllerService, FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import 'select2';
import { SearchFilterService } from '../../search/search-filter.service';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { RequestModel } from '../../model/request/request-model';
import { openNewWindow } from 'src/app/utils/utils';
import { NGXLogger } from 'ngx-logger';
import { Select2OptionData } from 'ng-select2';
import { FundingRequestTypeRulesDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestTypeRulesDto';
import { FundingRequestTypes, INITIAL_PAY_TYPES } from '../../model/request/funding-request-types';
import { Alert } from '../../alert-billboard/alert';
import { ControlContainer, NgForm } from '@angular/forms';
import { Options } from 'select2';


@Component({
  selector: 'app-funding-request-type',
  templateUrl: './funding-request-type.component.html',
  styleUrls: ['./funding-request-type.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class FundingRequestTypeComponent implements OnInit {
  @Input() filter: boolean;
  @Input() parentForm: NgForm;
  alerts: Alert[] = [];
  public requestTypes: FundingRequestTypeRulesDto[] = [];
  public searchFilter:
    { requestOrPlan: string; searchPool: string; requestType: string; }
    = { requestOrPlan: '', searchPool: '', requestType: '' };
  data: Array<Select2OptionData>;
  options: Options;
  clearableTypes = [
    FundingRequestTypes.SKIP,
    FundingRequestTypes.SKIP__NCI_RFA,
    FundingRequestTypes.PAY_TYPE_4,
    FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR
  ];
  private _selectedValue: number = null;

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();
  otherPayAlert: Alert = {
    type: 'warning',
    message: 'WARNING: This option should be selected only if your request will not be using any NCI funds.'
  };

  set selectedValue(value: number) {
    // NOTE: using push() to add alerts causes issues because this method gets called more than once.  if we solve that
    // problem, we can use the more natural approach of just pushing alerts into the queue.
    if (value) {
      let otherPay = false;
      if (Number(value) === FundingRequestTypes.OTHER_PAY_COMPETING_ONLY) {
        this.alerts = [this.otherPayAlert];
        otherPay = true;
      }
      if (INITIAL_PAY_TYPES.includes(Number(value))) {
        this.fsRequestControllerService.checkIsFundedByFundingPlanUsingGET(this.model.grant.applId).subscribe(result => {
          if (!!result && result !== 0) {
            const fundedAlert: Alert = {
              type: 'warning',
              message: 'WARNING: This grant application is selected for funding in funding plan #' + result
            };
            if (otherPay) {
              this.alerts = [this.otherPayAlert, fundedAlert];
            } else {
              this.alerts = [fundedAlert];
            }
          }
        });
      }
    } else {
      this.alerts = [];
    }
    // If we are changing to or from one of the clearable request types, we need to blow away the entire
    // PRC model
    if (this.clearableTypes.includes(value) || this.clearableTypes.includes(this._selectedValue)) {
      this.logger.warn('About to do something totally drastic: blowing away PRC model');
      this.model.programRecommendedCostsModel.deepReset(!!this.model.requestDto.frqId);
    }
    this.model.requestDto.frtId = value;
    this.model.requestDto.financialInfoDto.requestTypeId = value;
    this.model.programRecommendedCostsModel.fundingRequestType = value;
    const valueChanged = this._selectedValue && (Number(value) !== Number(this._selectedValue));

    this._selectedValue = value;
    this.selectedValueChange.emit(value);
    this.searchFilter.requestType = String(value);
    this.model.requestDto.frtId = value;
    this.model.requestDto.financialInfoDto.requestTypeId = value;
    this.model.programRecommendedCostsModel.fundingRequestType = value;
    if (valueChanged) {
      this.model.programRecommendedCostsModel.reset(this.model.requestDto.frqId ? true : false);
    }
  }

  constructor(private fsLookupControllerService: FsLookupControllerService,
              private searchFilterService: SearchFilterService,
              private userService: UserService,
              public model: RequestModel,
              private logger: NGXLogger,
              private fsRequestControllerService: FsRequestControllerService) {
  }

  ngOnInit(): void {
    this.options = {
      templateResult: this.templateResult.bind(this),
      templateSelection: this.templateSelection.bind(this)
    };
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

  templateResult(state: Select2OptionData): JQuery | string {
    if (!state.id) {
      return state.text;
    }
    if (state.additional?.nestedChild) {
      const rest = $('<span class="lvl3" style="padding-left:1.2em;">').text(state.text);
      // this.logger.debug(rest.clone().wrap('<div>').parent().html());
      return rest;
    }
    if (state.additional.nestedParent) {
      const rest = $('<span class="lvl2 parent" style="padding-left:.6em;">').text(state.text);
      // this.logger.debug(rest.clone().wrap('<div>').parent().html());
      return rest;
    }
    return state.text;
  }

  templateSelection(state: Select2OptionData): JQuery | string {
    if (!state.id) {
      return state.text;
    }
    return state.text;
  }

  prepareData(list: FundingRequestTypeRulesDto[]): void {
    const allParents = new Array<Select2OptionData>();
    const intermediateParents = new Array<number>();
    const nestedOptions = new Array<Select2OptionData>();
    const children = new Map<number, Select2OptionData[]>();
    let tmp: Select2OptionData;
    list.forEach(t => {
      tmp = {
        id: String(t.id),
        text: t.requestName,
        children: undefined,
        disabled: false,
        additional: { data: t },
      };
      if (!(t.parentFrtId) || t.parentCategoryFlag === 'Y') {
        allParents.push(tmp);
        if (t.parentFrtId && t.parentCategoryFlag === 'Y') {
          intermediateParents.push(t.id);
        }
        const c = children.get(t.id);
        if (!c) {
          children.set(t.id, new Array<Select2OptionData>());
        }
      }
      // if (t.parentFrtId) { // TODO: Nested optgroups in both places
      else { // TODO: nested optgroups only high-level (figure out sorting issues)
        const c = children.get(t.parentFrtId);
        if (!c) {
          children.set(t.parentFrtId, [tmp]);
        } else {
          c.push(tmp);
        }
      }
    });

    this.data = new Array<Select2OptionData>();

    allParents.forEach(r => {
      const c = children.get(Number(r.id));
      if (c && c.length > 0) {
        r.children = c;
      }
      if (intermediateParents.includes(Number(r.id))) {
        // r.additional.nestedChild = true;
        r.additional.nestedParent = true;
        children.get(Number(r.id))?.forEach(ch => {
          ch.additional.nestedChild = true;
        });
      }
      if (!intermediateParents.includes(Number(r.id))) {
        this.data.push(r);
      } else {
        nestedOptions.push(r);
      }
    });

    nestedOptions.forEach(n => {
      const parentId = Number(n.additional.data.parentFrtId);
      let tmpIndex: number;
      this.data.forEach((p, index) => {
        if (Number(p.id) === parentId) {
          tmpIndex = index;
        }
      });
      if (tmpIndex) {
        this.data.splice(tmpIndex + 1, 0, n);
      }
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
