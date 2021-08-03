import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-new-investigator',
  templateUrl: './new-investigator.component.html',
  styleUrls: ['./new-investigator.component.css']
})
export class NewInvestigatorComponent implements OnInit {
  data: Select2OptionData[];

  get model(): RequestModel {
    return this.requestModel;
  }

  constructor(private requestModel: RequestModel, private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.data = [
      { id: '', text: '' },
      { id: 'Y', text: 'Yes' },
      { id: 'N', text: 'No' }
    ];
  }

}
