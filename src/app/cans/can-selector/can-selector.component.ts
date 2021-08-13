import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CanManagementService } from '../can-management.service';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { Options } from 'select2';
import { RequestModel } from '../../model/request/request-model';

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {
  private _selectedValue: string;
  private _selectedCanData: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;
  // canMap: Map<string, CanCcxDto>;
  data: Array<Select2OptionData>;
  allOptions: Options;
  defaultOptions: Options;


  @Input() index = 0;
  @Input() nciSourceFlag = '';
  @Input() readonly = false;
  @Input() initialCAN: FundingRequestCanDto = null;
  public allCans = false;

  uniqueId: string;

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  get selectedCanData(): CanCcxDto {
    return this._selectedCanData; // ? this._selectedCanData : (this.canMap ? this.canMap.get(this._selectedValue) : null);
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
              private model: RequestModel) {
  }

  ngOnInit(): void {
    this.logger.info('Initial CAN:', this.initialCAN);
    const init = this.initialCAN;
    // this.updateCans();
    if (!this.readonly) {
      this.canService.projectedCanEmitter.subscribe(next => {
        if (Number(next.index) === Number(this.index)) {
          this.updateProjectedCan(next.can);
        }
      });
    }
    this.uniqueId = 'all_cans' + String(this.index);
    const activityCodes = this.model.requestDto.activityCode;
    const bmmCodes = this.model.requestDto.bmmCode;
    const nciSource = this.nciSourceFlag;
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
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      initSelection(element, callback): any {
        const c = {
          id: init.can,
          text: init.can  + ' | ' + init.canDescription,
          additional: init
        };
        console.log(element, callback, init, c);
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

  private updateCans(): void {
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this.defaultCans = result;
      // this.canMap = new Map(result.map(c => [c.can, c]));
      this.data = new Array<Select2OptionData>();
      result.forEach(r => {
        this.data.push({ id: r.can, text: r.can + ' | ' + r.canDescrip, additional: r });
      });
      if (this.initialCAN) {
        this.handleMisingInitialCAN();
        // this.selectedValue = this.initialCAN.can;
        this._selectedCanData = {
          can: this.initialCAN.can,
          canDescrip: this.initialCAN.canDescription,
          canPhsOrgCode: this.initialCAN.phsOrgCode
        };
      }
    }, error => {
      if (this.initialCAN) {
        this.handleMisingInitialCAN();
        this._selectedCanData = {
          can: this.initialCAN.can,
          canDescrip: this.initialCAN.canDescription,
          canPhsOrgCode: this.initialCAN.phsOrgCode
        };
      }
    });
  }

  private handleMisingInitialCAN(): void {
    const tmp = this.data.filter(e => e.id === this.initialCAN.can);
    if (!tmp || tmp.length === 0) {
      this.data.push({
        id: this.initialCAN.can,
        text: this.initialCAN.can + ' | ' + this.initialCAN.canDescription,
        additional: this.initialCAN
      });

      // this.canMap.set(this.initialCAN.can, {
      //   can: this.initialCAN.can,
      //   canDescrip: this.initialCAN.canDescription,
      //   canPhsOrgCode: this.initialCAN.phsOrgCode
      // });
    }
  }

  selectProjectedCan(): boolean {
    if (this.projectedCan && this.projectedCan.can && this.projectedCan.canDescrip) {
      this.selectedValue = this.projectedCan.can;
      return true;
    }
    return false;
  }

  updateProjectedCan(can: CanCcxDto): void {
    if (this.projectedCan && this.selectedValue && this.projectedCan.can === this.selectedValue) {
      this.selectedValue = null;
    }
    this.projectedCan = can;
  }

  onCheckboxChange(e: any, i: number): void {
    this.allCans = e.target.checked;
    if (!this.allCans) {
      // this.updateCans();
    }
  }
}
