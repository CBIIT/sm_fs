import { PercentPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'percentCut'
})
export class PercentCutPipe implements PipeTransform {

  constructor(private percentPipe: PercentPipe) {
  }

  transform(value: number, ...args: any[]): string {
    if (args[0]) { // args[0] is initialPay
      return '(' + this.percentPipe.transform(value, '1.0-2') + ' Cut)';
    }
    return '';
  }

}
