import { Pipe, PipeTransform } from '@angular/core';
import { AppLookupsService } from '../service/app-lookups.service';

@Pipe({
  name: 'codeDescription'
})
export class CodeDescriptionPipe implements PipeTransform {

  constructor(private appLookupsService: AppLookupsService) {
  }

  transform(value: string, ...args: string[]): string {
    if (!args[0]) {
      throw new Error('codeDescription pipe requires type parameter, such as CancerActivities.');
    }
    return this.appLookupsService.getDescription(args[0], value);
  }

}
