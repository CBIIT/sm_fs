import {Directive, Input} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";
import {NgbCalendar, NgbDate, NgbDateStruct} from "@ng-bootstrap/ng-bootstrap";
import {NGXLogger} from "ngx-logger";
import {DatepickerUtil} from "../datepicker/datepicker-adapter-formatter";

@Directive({
  selector: '[appEndDateBeforeStartValidator]',
  providers: [{provide: NG_VALIDATORS, useExisting: EndDateBeforeStartValidatorDirective, multi: true}]
})
export class EndDateBeforeStartValidatorDirective implements Validator {

  constructor(private calendar: NgbCalendar,
              private logger: NGXLogger) { }

  validate(control: AbstractControl): ValidationErrors {

    const startControlValue =  control.get('startDate') ? control.get('startDate').value : null;
    const endControlValue =  control.get('endDate') ? control.get('endDate').value : null;

    const startValue =NgbDate.from(
                        (typeof(startControlValue) === 'string' && startControlValue.indexOf('/') >= 0) ?
                        DatepickerUtil.fromModel(startControlValue.toString()) : startControlValue);
    const endValue =NgbDate.from(
                        (typeof(endControlValue) === 'string' && endControlValue.indexOf('/') >= 0) ?
                        DatepickerUtil.fromModel(endControlValue.toString()) : endControlValue);

    if (endValue != null && startValue != null && endValue.before(startValue)) {
      return { dateBeforeStart: true };
    }
    return null;
  }
}

