import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request/request-model';
import {NGXLogger} from 'ngx-logger';
import {ControlContainer, NgForm} from '@angular/forms';
import { ConversionMechanismData } from './conversion-mechanisms';

@Component({
  selector: 'app-type4-conversion-mechanism',
  templateUrl: './type4-conversion-mechanism.component.html',
  styleUrls: ['./type4-conversion-mechanism.component.css'],
  viewProviders: [{provide: ControlContainer, useExisting: NgForm}],
})
export class Type4ConversionMechanismComponent implements OnInit {
  label = 'Type 4 Conversion Mechanism';
  conversionMechs = ConversionMechanismData;
  // conversionMechs = [
  //   {id: '-1', text: ''},
  //   {id: 'No Change', text: 'No Change'},
  //   {id: 'UH3', text: 'UH3'},
  //   {id: 'K00', text: 'K00'},
  //   {id: 'R00', text: 'R00'},
  //   {id: 'R33', text: 'R33'},
  // ];

  get model(): RequestModel {
    return this.requestModel;
  }

  constructor(private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {

  }

}
