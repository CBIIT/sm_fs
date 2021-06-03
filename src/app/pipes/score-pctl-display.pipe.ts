import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatScorePctl'
})
export class ScorePctlDisplayPipe implements PipeTransform {

  transform(value: number, ...args: unknown[]): string {
    return (!value) ? '--' : String(value);
  }

}
