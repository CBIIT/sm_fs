import { Component, OnInit } from '@angular/core';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-fp-funding-source',
  templateUrl: './fp-funding-source.component.html',
  styleUrls: ['./fp-funding-source.component.css']
})
export class FpFundingSourceComponent implements OnInit {
  data: Select2OptionData[];
  selectedValue: string;

  constructor() {
  }

  ngOnInit(): void {
  }

}
