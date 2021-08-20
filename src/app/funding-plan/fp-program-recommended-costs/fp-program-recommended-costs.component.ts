import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-fp-program-recommended-costs',
  templateUrl: './fp-program-recommended-costs.component.html',
  styleUrls: ['./fp-program-recommended-costs.component.css']
})
export class FpProgramRecommendedCostsComponent implements OnInit {
  @Input() index: number;
  displayType: string;

  constructor() {
  }

  ngOnInit(): void {
  }

  toggleDisplay(value: string): void {
    this.displayType = value;
  }
}
