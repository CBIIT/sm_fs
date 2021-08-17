import { Directive } from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";
import {NgbCalendar, NgbDate, NgbDateStruct} from "@ng-bootstrap/ng-bootstrap";
import {NGXLogger} from "ngx-logger";

@Directive({
  selector: '[appDateInPast]',
  providers: [{provide: NG_VALIDATORS, useExisting: DateInPastValidatorDirective, multi: true}]
})

export class DateInPastValidatorDirective implements Validator {

  constructor(private calendar: NgbCalendar,
              private logger: NGXLogger) { }

  today: NgbDate = this.calendar.getToday();

  validate(control: AbstractControl): ValidationErrors | null {
    const value: NgbDateStruct = control.value;
    if (this.today.after(value)) {
      return { dateInPast: true };
    }
    return null;
  }

}
