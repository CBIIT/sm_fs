import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CanManagementService } from '../can-management.service';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { Options } from 'select2';
import { RequestModel } from '../../model/request/request-model';
import { NgForm } from '@angular/forms';
import { convertToFundingRequestCan } from '../can-utils';

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {
  get data(): Array<Select2OptionData> {
    return this._data;
  }

  set data(value: Array<Select2OptionData>) {
    this._data = value;
  }
  @ViewChild('canForm', { static: true }) canForm: NgForm;
  @Input() applId: number;
  @Input() fseId: number;
  @Input() bmmCodes: string;
  @Input() activityCodes: string;
  private _selectedValue: string;
  private _selectedCanData: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;
  private _data: Array<Select2OptionData>;
  allOptions: Options;
  defaultOptions: Options;
  basicOptions: Options;


  @Input() index = 0;
  @Input() nciSourceFlag = '';
  @Input() readonly = false;
  @Input() initialCAN: FundingRequestCanDto = null;
  @Input() canRequired = false;
  public allCans = false;

  uniqueId: string;

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  get selectedCanData(): CanCcxDto {
    return this._selectedCanData;
  }

  set selectedValue(value: string) {
    this.logger.debug('selectedValue:', value);
    this._selectedValue = value;
    if (value) {
      this.canService.getCanDetails(value).subscribe(result => {
        this._selectedCanData = result;
        this.logger.debug('new selected CAN', this._selectedCanData);
      });
    } else {
      this._selectedCanData = null;
    }
    this.selectedValueChange.emit(value);
  }

  constructor(private canService: CanManagementService,
              private logger: NGXLogger,
              private changeDetection: ChangeDetectorRef,
              private model: RequestModel) {
  }

  ngOnInit(): void {
    this.initializeDefaultCans();
    if (!this.readonly) {
      this.canService.projectedCanEmitter.subscribe(next => {
        if (Number(next.index) === Number(this.index)) {
          this.logger.debug('gotProjectedCan', next.can);
          this.updateProjectedCan(next.can);
        }
      });
    }
    this.uniqueId = 'all_cans' + String(this.index);
    if (!this.bmmCodes) {
      this.bmmCodes = this.model.requestDto?.bmmCode;
    }
    if (!this.activityCodes) {
      this.activityCodes = this.model.requestDto?.activityCode;
    }
    // this.initializeAjaxSettings();
    this.canService.selectCANEmitter.subscribe(next => {
      if (Number(next.fseId) === Number(this.fseId)) {
        this.handleNewCAN(next.can);
      }

    });
  }

  private handleNewCAN(can: CanCcxDto): void {
    this.logger.debug('Received new CAN', can);
    this.logger.debug(this._data);
    const frCAN = convertToFundingRequestCan(can);
    this.initializeSelectedCan(frCAN);
    this.data = this._data;
    this.changeDetection.detectChanges();
    this.logger.debug(this._data);
    this.selectedValue = frCAN.can;
  }

  private initializeAjaxSettings(): void {
    const init = this.initialCAN;
    const activityCodes = this.activityCodes;
    const bmmCodes = this.bmmCodes;
    const nciSource = this.nciSourceFlag;
    const data = this._data;

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
    this.logger.debug('initialize default cans');
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this._data = new Array<Select2OptionData>();
      result.forEach(r => {
        this._data.push({ id: r.can, text: r.can + ' | ' + r.canDescrip, additional: r });
      });
      if (this.initialCAN.can) {
        this.initializeSelectedCan(this.initialCAN);
      }
    });
  }

  private initializeSelectedCan(can: FundingRequestCanDto): void {
    const tmp = this._data.filter(e => e.id === can.can);
    if (!tmp || tmp.length === 0) {
      this.logger.debug('push new can', can);
      this._data.push({
        id: can.can,
        text: can.can + ' | ' + can.canDescription,
        additional: can
      });
    }
  }

  selectProjectedCan(): boolean {
    if (this.projectedCan && this.projectedCan.can && this.projectedCan.canDescrip) {
      const tmp = this._data.filter(e => e.id === this.projectedCan.can);
      if (!tmp || tmp.length === 0) {
        this._data.push({
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
    if (this.projectedCan && this.selectedValue && this.projectedCan.can !== this.selectedValue) {
      this.selectedValue = null;
    }
    this.projectedCan = can;
  }

  onCheckboxChange(e: any, i: number): void {
    this.allCans = e.target.checked;
  }
}
