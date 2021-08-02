import { Component, Input, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { ControlContainer, NgForm } from '@angular/forms';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-final-loa',
  templateUrl: './final-loa.component.html',
  styleUrls: ['./final-loa.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FinalLoaComponent implements OnInit {
  @Input() parentForm: NgForm;
  private _selectedValue: number;
  data: Array<Select2OptionData>;

  get selectedValue(): number {
    return this._model.requestDto.financialInfoDto.loaId;
  }

  set selectedValue(value: number) {
    this._selectedValue = value;
    this._model.requestDto.financialInfoDto.loaId = value;
  }


  get model(): RequestModel {
    return this._model;
  }

  constructor(private _model: RequestModel) {
    this.data = [];
    this.data.push({ id: '-1', text: '' });
    this.data.push({ id: '1', text: 'Program Director' });
    this.data.push({ id: '2', text: 'DOC Director' });
    this.data.push({ id: '3', text: 'NCI Director' });
    this.data.push({ id: '4', text: 'NCI Scientific Program Leaders' });
  }

  ngOnInit(): void {
  }

}
