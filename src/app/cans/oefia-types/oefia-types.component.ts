import { Component, Input, EventEmitter, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementService } from '../can-management.service';
import { OefiaCodingDto } from '@nci-cbiit/i2ecws-lib';
import { Output } from '@angular/core';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-oefia-types',
  templateUrl: './oefia-types.component.html',
  styleUrls: ['./oefia-types.component.css']
})
export class OefiaTypesComponent implements OnInit {
  @Input() index = 0;
  @Input() fseId: number;
  oefiaCodes: OefiaCodingDto[];
  selectedOefiaType: { id: string; text: string };
  private _selectedValue: number;
  @Input() readonly = false;
  @Input() octId = null;

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();
  data: Select2OptionData[];

  set selectedValue(value: number) {
    this._selectedValue = value;
    if (value && this.data) {
      this.data.forEach(d => {
        if (d.id === String(value)) {
          this.selectedOefiaType = d;
        }
      });
    } else {
      this.selectedOefiaType = null;
    }
    this.selectedValueChange.emit(value);
    this.canService.oefiaTypeEmitter.next({ index: this.index, value, fseId: this.fseId });
  }

  constructor(private logger: NGXLogger, private canService: CanManagementService) {
  }

  ngOnInit(): void {
    this.canService.getOefiaCodes().subscribe(result => {
      this.oefiaCodes = result;
      this.data = [];
      this.data.push({ id: '', text: '' });
      result.forEach(c => {
        this.data.push({ id: String(c.id), text: c.category });
      });
    });
  }
}
