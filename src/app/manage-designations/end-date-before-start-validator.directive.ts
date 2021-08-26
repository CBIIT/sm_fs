import {Directive, Input} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";
import {NgbCalendar, NgbDate, NgbDateStruct} from "@ng-bootstrap/ng-bootstrap";
import {NGXLogger} from "ngx-logger";

@Directive({
  selector: '[appEndDateBeforeStartValidator]',
  providers: [{provide: NG_VALIDATORS, useExisting: EndDateBeforeStartValidatorDirective, multi: true}]
})
export class EndDateBeforeStartValidatorDirective implements Validator {

  @Input('appEndDateBeforeStartValidator') startValue;

  constructor(private calendar: NgbCalendar,
              private logger: NGXLogger) { }

  validate(control: AbstractControl): ValidationErrors {

    const value: NgbDate = NgbDate.from(control.value);
    if (value != null && this.startValue != null && value.before(this.startValue)) {
      return { dateBeforeStart: true };
    }
    return null;
  }

}

