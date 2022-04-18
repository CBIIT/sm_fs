import { Component, Input, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { ControlContainer, NgForm } from '@angular/forms';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-diversity-supplement',
  templateUrl: './diversity-supplement.component.html',
  styleUrls: ['./diversity-supplement.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class DiversitySupplementComponent implements OnInit {
  @Input() parentForm: NgForm;
  data: Array<Select2OptionData>;

  constructor(public requestModel: RequestModel) {
    this.data = [];
    this.data.push({ id: '1', text: 'New' });
    this.data.push({ id: '2', text: 'Additional Year (Extension)' });
  }

  ngOnInit(): void {
  }

}
