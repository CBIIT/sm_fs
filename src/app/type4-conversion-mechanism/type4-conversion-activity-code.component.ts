import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';
import { ConversionActivityCodeData } from './conversion-activity-codes';

@Component({
  selector: 'app-type4-conversion-mechanism',
  templateUrl: './type4-conversion-activity-code.component.html',
  styleUrls: ['./type4-conversion-activity-code.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class Type4ConversionActivityCodeComponent implements OnInit {
  label = 'Type 4 Conversion Mechanism';
  conversionActivityCodes = ConversionActivityCodeData;

  get model(): RequestModel {
    return this.requestModel;
  }

  constructor(private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {

  }

}
