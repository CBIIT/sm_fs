import { Component, Input, OnInit } from '@angular/core';
import { Select2OptionData } from 'ng-select2';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';

@Component({
  selector: 'app-recommended-future-years',
  templateUrl: './recommended-future-years.component.html',
  styleUrls: ['./recommended-future-years.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class RecommendedFutureYearsComponent implements OnInit {
  @Input() index: number;
  @Input() applId: number;
  @Input() required = false;
  @Input() parentForm: NgForm;

  selectedValue: number;
  data: Select2OptionData[] = [
    { id: '0', text: '0' },
    { id: '1', text: '1' },
    { id: '2', text: '2' },
    { id: '3', text: '3' },
    { id: '4', text: '4' },
    { id: '5', text: '5' },
    { id: '6', text: '6' }
  ];

  constructor(
    private planService: PlanManagementService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (!!this.applId) {
      this.selectedValue = this.planService.getRecommendedFutureYears(Number(this.applId));
    }
    this.logger.info(`RecommendedFutureYearsComponent for applId: ${this.applId} == ${this.selectedValue}`);
  }

}
