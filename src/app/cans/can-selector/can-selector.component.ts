import {Component, Input, OnInit, Output, EventEmitter} from '@angular/core';
import {CanManagementServiceBus} from '../can-management-service-bus.service';
import {RequestModel} from '../../model/request-model';
import {NGXLogger} from 'ngx-logger';
import {CanCcxDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {
  _selectedCan: CanCcxDto;
  defaultCans: CanCcxDto[];
  projectedCan: CanCcxDto;

  @Input() index = 0;

  @Input() nciSourceFlag: string;

  @Input()
  get selectedCan(): CanCcxDto {
    return this._selectedCan;
  }

  @Output() selectedValueChange = new EventEmitter<CanCcxDto>();

  set selectedCan(value: CanCcxDto) {
    this._selectedCan = value;
    this.selectedValueChange.emit(value);
    this.canService.selectedCanEmitter.next({index: this.index, can: value});
  }

  constructor(private canService: CanManagementServiceBus,
              private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this.defaultCans = result;
    });
    this.canService.projectedCanEmitter.subscribe(next => {
      if (Number(next.index) === Number(this.index)) {
        this.updateProjectedCan(next.can);
      }
    });
  }

  selectProjectedCan(): boolean {
    if(this.projectedCan) {
      this.selectedCan = this.projectedCan;
      return true;
    }
    return false;
  }

  updateProjectedCan(can: CanCcxDto): void {
    this.projectedCan = can;

  }
}
