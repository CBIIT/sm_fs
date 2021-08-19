import { Component, Input, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-fp-funding-information',
  templateUrl: './fp-funding-information.component.html',
  styleUrls: ['./fp-funding-information.component.css']
})
export class FpFundingInformationComponent implements OnInit {
  @Input() parentForm: NgForm;

  constructor() {
  }

  ngOnInit(): void {
  }

}
