import { Pipe, PipeTransform } from '@angular/core';
import { isNumeric } from 'rxjs/internal-compatibility';

@Pipe({
  name: 'percentToggle'
})
export class PercentTogglePipe implements PipeTransform {
  transform(value: number, ...args: any[]): any {
    if (!value || isNaN(value)) {
      return '';
    }
    if (value === 0) {
      return '';
    }

    return '(' + value + '% cut)';
  }
}
