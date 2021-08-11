import { Pipe, PipeTransform } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Pipe({
  name: 'formatNcabDate'
})
export class FormatNcabDatePipe implements PipeTransform {

  constructor(private logger: NGXLogger ) {
  }

  transform(value: string): string {
    if (value && value.length === 6) {
      return value.substr(4, 2) + '/' + value.substr(0, 4);
    }
    else {
      this.logger.warn(value + 'is an invalid Nccab Date');
      return value;
    }
  }

}
