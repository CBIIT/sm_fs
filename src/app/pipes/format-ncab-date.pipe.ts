import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatNcabDate'
})
export class FormatNcabDatePipe implements PipeTransform {

  transform(value: string): string {
    return value.substr(4,2)+'/'+value.substr(0,4);
  }

}
