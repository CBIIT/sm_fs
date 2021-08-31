import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer, NgForm } from '@angular/forms';

@Component({
  selector: 'app-fp-funding-information',
  templateUrl: './fp-funding-information.component.html',
  styleUrls: ['./fp-funding-information.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FpFundingInformationComponent implements OnInit {
  @Input() parentForm: NgForm;
  firstYearSetAside: number = null;
  totalSetAside: number = null;
  outYear2: number = null;
  outYear3: number = null;
  outYear4: number = null;
  outYear5: number = null;

  constructor() {
  }

  ngOnInit(): void {
  }

}
