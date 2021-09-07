import {Injectable} from "@angular/core";
import {NgbDateAdapter, NgbDateParserFormatter, NgbDateStruct} from "@ng-bootstrap/ng-bootstrap";

/**
 * This Service handles how the date is represented in scripts i.e. ngModel.
 */
@Injectable()
export class DatepickerAdapter extends NgbDateAdapter<string> {

  fromModel(value: string | null): NgbDateStruct | null {
    return DatepickerUtil.fromModel(value);
  }

  toModel(date: NgbDateStruct | null): string | null {
    return DatepickerUtil.toModel(date);
  }
}

/**
 * This Service handles how the date is rendered and parsed from keyboard i.e. in the bound input field.
 */
@Injectable()
export class DatepickerFormatter extends NgbDateParserFormatter {

  readonly DELIMITER = '/';

  parse(value: string): NgbDateStruct | null {
    if (value) {
      let date = value.split(this.DELIMITER);
      return {
        day : parseInt(date[1], 10),
        month : parseInt(date[0], 10),
        year : parseInt(date[2], 10)
      };
    }
    return null;
  }

  format(date: NgbDateStruct | null): string {
    return date ? date.month + this.DELIMITER + date.day + this.DELIMITER + date.year : '';
  }
}

@Injectable()
export class DatepickerUtil {

  private static DELIMITER: string = '/';

  static fromModel(value: string | null): NgbDateStruct | null {
    if (value) {
      let date = value.split(this.DELIMITER);
      return {
        day : parseInt(date[1], 10),
        month : parseInt(date[0], 10),
        year : parseInt(date[2], 10)
      };
    }
    return null;
  }

  static toModel(date: NgbDateStruct | null): string | null {
    return date ? date.month + this.DELIMITER + date.day + this.DELIMITER + date.year : null;
  }
}

