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

  get firstYearSetAsideDisplay(): string {
    if (this.firstYearSetAside) {
      return this.firstYearSetAside.toLocaleString();
    }
    return null;
  }

  set firstYearSetAsideDisplay(value: string) {
    this.firstYearSetAside = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.firstYearSetAside = Number(value);
      }
    }
  }

  get totalSetAsideDisplay(): string {
    if (this.totalSetAside) {
      return this.totalSetAside.toLocaleString();
    }
    return null;
  }

  set totalSetAsideDisplay(value: string) {
    this.totalSetAside = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.totalSetAside = Number(value);
      }
    }
  }

  get outYear2Display(): string {
    if (this.outYear2) {
      return this.outYear2.toLocaleString();
    }
    return null;
  }

  set outYear2Display(value: string) {
    this.outYear2 = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.outYear2 = Number(value);
      }
    }
  }

  get outYear3Display(): string {
    if (this.outYear3) {
      return this.outYear3.toLocaleString();
    }
    return null;
  }

  set outYear3Display(value: string) {
    this.outYear3 = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.outYear3 = Number(value);
      }
    }
  }

  get outYear4Display(): string {
    if (this.outYear4) {
      return this.outYear4.toLocaleString();
    }
    return null;
  }

  set outYear4Display(value: string) {
    this.outYear4 = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.outYear4 = Number(value);
      }
    }
  }

  get outYear5Display(): string {
    if (this.outYear5) {
      return this.outYear5.toLocaleString();
    }
    return null;
  }

  set outYear5Display(value: string) {
    this.outYear5 = null;
    if (value) {
      value = value.replace(/\,/g, '');
      if (value) {
        this.outYear5 = Number(value);
      }
    }
  }

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
