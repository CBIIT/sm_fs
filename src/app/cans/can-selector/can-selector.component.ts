import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CanManagementServiceBus } from '../can-management-service-bus.service';
import { RequestModel } from '../../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {
  private _selectedCan: string;
  private _selectedCanData: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;
  canMap: Map<string, CanCcxDto>;

  @Input() index = 0;

  @Input() nciSourceFlag: string;

  @Input()
  get selectedCan(): string {
    return this._selectedCan;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  get selectedCanData(): CanCcxDto {
    return this._selectedCanData;
  }

  set selectedCan(value: string) {
    this._selectedCan = value;
    if (value) {
      this._selectedCanData = this.canMap.get(value);
    }
    this.selectedValueChange.emit(value);
    // this.canService.selectedCanEmitter.next({ index: this.index, can: this.canMap.get(value) });
  }

  constructor(private canService: CanManagementServiceBus,
              private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this.defaultCans = result;
      this.canMap = new Map(result.map(c => [c.can, c]));
    });
    this.canService.projectedCanEmitter.subscribe(next => {
      if (Number(next.index) === Number(this.index)) {
        this.updateProjectedCan(next.can);
      }
    });
  }

  selectProjectedCan(): boolean {
    if (this.projectedCan && this.projectedCan.can && this.projectedCan.canDescrip) {
      this.selectedCan = this.projectedCan.can;
      return true;
    }
    return false;
  }

  updateProjectedCan(can: CanCcxDto): void {
    this.projectedCan = can;

  }
}
