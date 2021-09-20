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
  @Input() fseId: number;
  private _selectedValue: string;
  private _selectedCanData: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;
  data: Array<Select2OptionData>;


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



  constructor(private canManagementService: CanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.data = [];
    this.canManagementService.getPlanDefaultCans(null, this.bmmCodes, this.activityCodes, this.nciSourceFlag).subscribe(result => {
      this.rawData = result;
      result.forEach(can => {

      });
    });
  }

  get selectedCanData(): CanCcxDto {
    return this._selectedCanData;
  }

  set selectedValue(value: string) {
    this._selectedValue = value;
    if (value) {
      this.canManagementService.getCanDetails(value).subscribe(result => {
        this._selectedCanData = result;
      });
    } else {
      this._selectedCanData = null;
    }
    this.selectedValueChange.emit(value);
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
