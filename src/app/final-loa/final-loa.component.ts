import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {ControlContainer, NgForm} from '@angular/forms';

@Component({
  selector: 'app-final-loa',
  templateUrl: './final-loa.component.html',
  styleUrls: ['./final-loa.component.css'],
  viewProviders: [{provide: ControlContainer, useExisting: NgForm}]
})
export class FinalLoaComponent implements OnInit {
  get selectedValue(): number {
    return this._model.requestDto.loaId;
  }

  set selectedValue(value: number) {
    this._selectedValue = value;
    this._model.requestDto.loaId = value;
  }

  private _selectedValue: number;

  get model(): RequestModel {
    return this._model;
  }

  constructor(private _model: RequestModel) {
  }

  ngOnInit(): void {
  }

}
