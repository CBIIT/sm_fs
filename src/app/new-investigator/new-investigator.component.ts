import { Component, OnInit } from '@angular/core';
import {RequestModel} from '../model/request-model';
import {NGXLogger} from 'ngx-logger';

@Component({
  selector: 'app-new-investigator',
  templateUrl: './new-investigator.component.html',
  styleUrls: ['./new-investigator.component.css']
})
export class NewInvestigatorComponent implements OnInit {

  get model(): RequestModel {
    return this.requestModel;
  }

  constructor(private requestModel: RequestModel, private logger: NGXLogger) { }

  ngOnInit(): void {
  }

}
