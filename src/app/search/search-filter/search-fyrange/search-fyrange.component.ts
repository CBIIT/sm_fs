import {Component, Input, OnInit} from '@angular/core';
import {ControlContainer, NgForm} from "@angular/forms";

@Component({
  selector: 'app-search-fyrange',
  templateUrl: './search-fyrange.component.html',
  styleUrls: ['./search-fyrange.component.css'],
  viewProviders: [ { provide: ControlContainer, useExisting: NgForm } ]
})
export class SearchFyrangeComponent implements OnInit {

  @Input() form: NgForm;
  @Input('minYear') minYear: number;
  @Input('maxYear') maxYear: number;

  years = [];

  constructor() { }

  ngOnInit(): void {
    if (this.minYear > this.maxYear) {
      console.error("minYear cannot be greater than maxYear.");
    } else {
      for (let i = this.minYear; i <= this.maxYear; i++) {
        this.years.push(i);
      }
    }
  }

  onYearSelect($event: string | string[]) {
    const values = this.form.form.controls.fyRange.value;
    if (values && values.fromFy && values.fromFy.length > 0 &&
        values.toFy && values.toFy.length > 0 && +values.fromFy > +values.toFy) {
      this.form.form.controls.fyRange.setErrors({isFyRangeError: true});
    }
    else {
      this.form.form.controls.fyRange.setErrors(null);
    }
  }
}
