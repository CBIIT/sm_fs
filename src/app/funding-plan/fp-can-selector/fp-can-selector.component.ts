import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { Options } from 'select2';
import { CanManagementService } from '../../cans/can-management.service';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from '../../model/request/request-model';

@Component({
  selector: 'app-fp-can-selector',
  templateUrl: './fp-can-selector.component.html',
  styleUrls: ['./fp-can-selector.component.css']
})
export class FpCanSelectorComponent implements OnInit {
  @Input() applId: number;
  @Input() bmmCodes: string;
  @Input() activityCodes: string;
  private _selectedValue: string;
  private _selectedCanData: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;
  data: Array<Select2OptionData>;
  allOptions: Options;
  defaultOptions: Options;
  basicOptions: Options;


  @Input() index = 0;
  @Input() nciSourceFlag = '';
  @Input() readonly = false;
  @Input() initialCAN: FundingRequestCanDto = null;
  public allCans = false;

  uniqueId: string;
  private rawData: CanCcxDto[];

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  get selectedCanData(): CanCcxDto {
    return this._selectedCanData;
  }

  set selectedValue(value: string) {
    this._selectedValue = value;
    if (value) {
      this.canService.getCanDetails(value).subscribe(result => {
        this._selectedCanData = result;
      });
    } else {
      this._selectedCanData = null;
    }
    this.selectedValueChange.emit(value);
  }

  constructor(private canService: CanManagementService,
              private logger: NGXLogger,
              private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    this.canService.getActiveCans('', this.nciSourceFlag).subscribe(results => {
      this.logger.debug('active CANs:', results);
      this.rawData = results;
      this.data = new Array<Select2OptionData>();
      results.forEach(can => {
        this.data.push({
            id: can.can,
            text: can.can + ' | ' + can.canDescrip,
            additional: can
        });
      });
    });
  }

  private initializeAjaxSettings(): void {
    const init = this.initialCAN;
    const activityCodes = this.activityCodes;
    const bmmCodes = this.bmmCodes;
    const nciSource = this.nciSourceFlag;
    const data = this.data;
    this.logger.debug('data', data);

    this.basicOptions = {
      allowClear: true,
      data,
      initSelection(element, callback): any {
        const c = {
          id: init.can,
          text: init.can + ' | ' + init.canDescription,
          additional: init
        };
        callback(c);
      },
    };

    this.allOptions = {
      allowClear: true,
      minimumInputLength: 3,
      closeOnSelect: true,
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      initSelection(element, callback): any {
        const c = {
          id: init.can,
          text: init.can + ' | ' + init.canDescription,
          additional: init
        };
        callback(c);
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/cans/all-cans/',
        delay: 500,
        type: 'GET',
        data(params): any {
          const query = {
            can: params.term,
            activityCodes,
            bmmCodes,
            nciSourceFlag: nciSource
          };

          return query;
        },
        processResults(searchData): any {
          return {
            results: $.map(searchData, can => {
              return {
                id: can.can,
                text: can.can + ' | ' + can.canDescrip,
                additional: can
              };
            })
          };
        }
      }
    };

    this.defaultOptions = {
      allowClear: true,
      minimumInputLength: 3,
      closeOnSelect: true,
      data,
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      initSelection(element, callback): any {
        const c = {
          id: init.can,
          text: init.can + ' | ' + init.canDescription,
          additional: init
        };
        callback(c);
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/cans/',
        delay: 500,
        type: 'GET',
        data(params): any {
          const query = {
            can: params.term,
            activityCodes,
            bmmCodes,
            nciSourceFlag: nciSource
          };

          return query;
        },
        processResults(searchData): any {
          return {
            results: $.map(searchData, can => {
              return {
                id: can.can,
                text: can.can + ' | ' + can.canDescrip,
                additional: can
              };
            })
          };
        }
      }
    };
  }

  private initializeDefaultCans(): void {
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this.data = new Array<Select2OptionData>();
      result.forEach(r => {
        this.data.push({ id: r.can, text: r.can + ' | ' + r.canDescrip, additional: r });
      });
      if (this.initialCAN.can) {
        this.initializeSelectedCan();
      }
    });
  }

  private initializeSelectedCan(): void {
    const tmp = this.data.filter(e => e.id === this.initialCAN.can);
    if (!tmp || tmp.length === 0) {
      this.data.push({
        id: this.initialCAN.can,
        text: this.initialCAN.can + ' | ' + this.initialCAN.canDescription,
        additional: this.initialCAN
      });
    }
  }

  selectProjectedCan(): boolean {
    this.logger.debug('selectProjectedCan', this.projectedCan);

    if (this.projectedCan && this.projectedCan.can && this.projectedCan.canDescrip) {
      const tmp = this.data.filter(e => e.id === this.projectedCan.can);
      if (!tmp || tmp.length === 0) {
        this.data.push({
          id: this.projectedCan.can,
          text: this.projectedCan.can + ' | ' + this.projectedCan.canDescrip,
          additional: this.projectedCan
        });
      }
      this.selectedValue = this.projectedCan.can;
      return true;
    }
    return false;
  }

  updateProjectedCan(can: CanCcxDto): void {
    this.logger.debug('updateProjecteCan', can);
    if (this.projectedCan && this.selectedValue && this.projectedCan.can === this.selectedValue) {
      this.selectedValue = null;
    }
    this.projectedCan = can;
  }

  onCheckboxChange(e: any, i: number): void {
    this.allCans = e.target.checked;
  }
}