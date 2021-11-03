import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyToggle'
})
export class CurrencyTogglePipe extends CurrencyPipe implements PipeTransform {
  
  transform(value: number, ...args: any[]): any {
    if (!value || isNaN(value)) {
      return '--';
    }
    if (value === 0) {
      return '--';
    }
    let formattedByMe = super.transform(value, ...args);
    return formattedByMe;
  }

}
