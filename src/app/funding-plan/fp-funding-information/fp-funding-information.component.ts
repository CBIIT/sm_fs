import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer, NgForm } from '@angular/forms';
import { PlanModel } from '../../model/plan/plan-model';

@Component({
  selector: 'app-fp-funding-information',
  templateUrl: './fp-funding-information.component.html',
  styleUrls: ['./fp-funding-information.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FpFundingInformationComponent implements OnInit {
  @Input() parentForm: NgForm;
  @Input() readOnly = false;
  @Input() collapse = false;
  firstYearSetAside: number = null;
  totalSetAside: number = null;
  outYear2: number = null;
  outYear3: number = null;
  outYear4: number = null;
  outYear5: number = null;

  constructor(
    private planModel: PlanModel) {
  }

  ngOnInit(): void {
    this.firstYearSetAside = this.planModel.fundingPlanDto.pubYr1SetAsideAmt;
    this.totalSetAside = this.planModel.fundingPlanDto.totalPubSetAsideAmt;
    this.outYear2 = this.planModel.fundingPlanDto.fundingEstYr2Amt;
    this.outYear3 = this.planModel.fundingPlanDto.fundingEstYr3Amt;
    this.outYear4 = this.planModel.fundingPlanDto.fundingEstYr4Amt;
    this.outYear5 = this.planModel.fundingPlanDto.fundingEstYr5Amt;
  }

  get firstYearTotalCalculated(): number {
    return this.planModel.fundingPlanDto.totalRecommendedAmt;
  }
}
