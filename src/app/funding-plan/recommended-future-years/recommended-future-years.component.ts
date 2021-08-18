import { Component, Input, OnInit } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-recommended-future-years',
  templateUrl: './recommended-future-years.component.html',
  styleUrls: ['./recommended-future-years.component.css']
})
export class RecommendedFutureYearsComponent implements OnInit {
  @Input() index: number;
  selectedValue: number;
  data: Select2OptionData[] = [
    { id: '0', text: '0' },
    { id: '1', text: '1' },
    { id: '2', text: '2' },
    { id: '3', text: '3' },
    { id: '4', text: '4' },
    { id: '5', text: '5' },
  ];

  constructor(private planModel: PlanModel) {
  }

  ngOnInit(): void {
  }

}
