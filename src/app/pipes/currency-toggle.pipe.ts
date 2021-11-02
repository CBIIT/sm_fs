import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyToggle'
})
export class CurrencyTogglePipe implements PipeTransform {

  transform(value: number, ...args: any[]): any {
    if (!value || isNaN(value)) {
      return '--';
    }
    if (value === 0) {
      return '--';
    }

    return '$' + value;
  }

}