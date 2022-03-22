import { Component, Input, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';
import { ConversionActivityCodeData } from './conversion-activity-codes';
import { Type4SelectionService } from './type4-selection.service';

@Component({
  selector: 'app-type4-conversion-mechanism',
  templateUrl: './type4-conversion-activity-code.component.html',
  styleUrls: ['./type4-conversion-activity-code.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class Type4ConversionActivityCodeComponent implements OnInit {
  private _selectedValue: string;

  get selectedValue(): string {
    return this.model.requestDto.conversionActivityCode;
  }

  set selectedValue(value: string) {
    this._selectedValue = value;
    this.model.requestDto.conversionActivityCode = value;
    this.type4SelectionService.Type4SelectionEmitter.next(value);
  }

  @Input() parentForm: NgForm;

  label = 'Conversion Grant Activity Code/Mechanism';
  conversionActivityCodes = ConversionActivityCodeData;

  get model(): RequestModel {
    return this.requestModel;
  }

  constructor(private requestModel: RequestModel,
              private logger: NGXLogger,
              private type4SelectionService: Type4SelectionService) {
  }

  ngOnInit(): void {

  }

}
