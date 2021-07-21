import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CanManagementServiceBus } from '../can-management-service-bus.service';
import { RequestModel } from '../../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';

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
  canMap: Map<string, CanCcxDto>;
  data: Array<Select2OptionData>;

  @Input() index = 0;

  @Input() nciSourceFlag: string = '';

  @Input() readonly = false;

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  get selectedCanData(): CanCcxDto {
    return this._selectedCanData ? this._selectedCanData : (this.canMap ? this.canMap.get(this._selectedValue) : null);
  }

  set selectedValue(value: string) {
    this._selectedValue = value;
    if (value && this.canMap) {
      this._selectedCanData = this.canMap.get(value);
    } else {
      this._selectedCanData = null;
    }
    this.selectedValueChange.emit(value);
  }

  constructor(private canService: CanManagementServiceBus,
              private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this.defaultCans = result;
      this.canMap = new Map(result.map(c => [c.can, c]));
      this.data = new Array<Select2OptionData>();
      result.forEach(r => {
        this.data.push({ id: r.can, text: r.can + ' | ' + r.canDescrip });
      });
      // this.selectedValue = this._selectedValue;
    });
    this.canService.projectedCanEmitter.subscribe(next => {
      if (Number(next.index) === Number(this.index)) {
        this.updateProjectedCan(next.can);
      }
    });
  }

  selectProjectedCan(): boolean {
    if (this.projectedCan && this.projectedCan.can && this.projectedCan.canDescrip) {
      this.selectedValue = this.projectedCan.can;
      return true;
    }
    return false;
  }

  updateProjectedCan(can: CanCcxDto): void {
    this.projectedCan = can;
  }
}
