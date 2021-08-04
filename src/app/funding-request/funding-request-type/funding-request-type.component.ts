import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FsLookupControllerService } from '@nci-cbiit/i2ecws-lib';
import 'select2';
import { SearchFilterService } from '../../search/search-filter.service';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { RequestModel } from '../../model/request/request-model';
import { openNewWindow } from 'src/app/utils/utils';
import { NGXLogger } from 'ngx-logger';
import { Select2OptionData } from 'ng-select2';
import { FundingRequestTypeRulesDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestTypeRulesDto';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
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
  private _selectedValue: number = null;

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();
  alert: Alert = {
    type: 'warning',
    message: 'WARNING: This option should be selected only if your request will not be using any NCI funds.'
  };

  set selectedValue(value: number) {
    if (value && Number(value) === FundingRequestTypes.OTHER_PAY_COMPETING_ONLY) {
      this.alerts = [this.alert];
    } else {
      this.alerts = [];
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
      this.model.programRecommendedCostsModel.reset();
    }
  }

  constructor(private fsLookupControllerService: FsLookupControllerService,
              private searchFilterService: SearchFilterService,
              private userService: UserService,
              public model: RequestModel,
              private logger: NGXLogger) {
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
      const rest = $('<span class="lvl3" style="padding-left:2em;">').text(state.text);
      this.logger.debug(rest.clone().wrap('<div>').parent().html());
      return rest;
    }
    if (state.additional.nestedParent) {
      const rest = $('<span class="lvl2 parent" style="padding-left:1em;">').text(state.text);
      this.logger.debug(rest.clone().wrap('<div>').parent().html());
      return rest;
    }
    return state.text;
  }

  templateSelection(state: Select2OptionData): JQuery | string {
    this.logger.debug('templateSelection', state);
    if (!state.id) {
      return state.text;
    }
    return state.text;
  }

  prepareData(list: FundingRequestTypeRulesDto[]): void {
    this.logger.debug('before');
    this.logger.debug(list);
    list.sort((r1, r2) => {
      if (Number(r1.parentFrtId) === Number(r2.parentFrtId)) {
        return Number(r1.id) - Number(r2.id);
      }
      return Number(r1.parentFrtId) - Number(r2.parentFrtId);
    });
    this.logger.debug('after');
    this.logger.debug(list);
    const allParents = new Array<Select2OptionData>();
    const intermediateParents = new Array<number>();
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
    this.logger.debug('all parent options (optgroups)');
    this.logger.debug(allParents);

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
      this.data.push(r);
    });

    this.data = this.data.sort((r1, r2): number => {
      if (Number(r1.additional.data.parentId) === Number(r2.additional.data.parentId)) {
        return Number(r1.id) - Number(r2.id);
      }
      return Number(r1.additional.data.parentId) - Number(r2.additional.data.parentId);
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
