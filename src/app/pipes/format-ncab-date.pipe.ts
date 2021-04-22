import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatNcabDate'
})
export class FormatNcabDatePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
