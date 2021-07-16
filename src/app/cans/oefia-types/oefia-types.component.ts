import { Component, Input, EventEmitter, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementServiceBus } from '../can-management-service-bus.service';
import { OefiaCodingDto } from '@nci-cbiit/i2ecws-lib';
import { Output } from '@angular/core';

@Component({
  selector: 'app-oefia-types',
  templateUrl: './oefia-types.component.html',
  styleUrls: ['./oefia-types.component.css']
})
export class OefiaTypesComponent implements OnInit {
  @Input() index = 0;
  oefiaCodes: OefiaCodingDto[];

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();

  set selectedValue(value: number) {
    this._selectedValue = value;
    this.logger.debug('emitting new value:', value, this.index, this.oefiaCodes);
    this.selectedValueChange.emit(value);
    this.canService.oefiaTypeEmitter.next({ index: this.index, value });
  }

  private _selectedValue: number;

  constructor(private logger: NGXLogger, private canService: CanManagementServiceBus) {
  }

  ngOnInit(): void {
    this.canService.getOefiaCodes().subscribe(result => {
      this.oefiaCodes = result;
      if (this._selectedValue) {
        this.selectedValue = this._selectedValue;
      }
    });
  }

}
