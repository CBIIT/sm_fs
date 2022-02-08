import { PercentPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Pipe({
  name: 'percentCut'
})
export class PercentCutPipe implements PipeTransform {

  constructor(private percentPipe: PercentPipe, private logger: NGXLogger) {
  }

  transform(value: number, ...args: any[]): string {
    if (value && args[0]) { // args[0] is initialPay
      const res = '(' + this.percentPipe.transform(value, '1.0-2') + ' Cut)';
      return res;
    }
    return '';
  }

}
