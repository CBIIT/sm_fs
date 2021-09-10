import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatNiEsiFlag'
})
export class FormatNiEsiFlagPipe implements PipeTransform {

  transform(value: string, ...args: unknown[]): string {

    return (value === '0') ? 'N' : (value === '1') ? 'Y' : (value === '2') ? 'N/A' : '--';

  }

}
