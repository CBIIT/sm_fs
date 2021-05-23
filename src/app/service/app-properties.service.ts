import { Inject, Injectable, InjectionToken } from '@angular/core';
import { LookupsControllerService } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AppPropertiesService {

  private appProperties = {};
  private overrideProperties: any;
  private appName: string;


  constructor(private lookupService: LookupsControllerService,
              @Inject(PROPERTIES_APP_NAME) appName: string,
              @Inject(PROPERTIES_OVERRIDE) overrideProperties: any) {
      this.appName = appName;
      this.overrideProperties = overrideProperties;
  }

  delay = ms => new Promise(res => setTimeout(res, ms));

  initialize(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      console.log('AppPropertiesService initialize Starts, appName=' + this.appName);
      this.lookupService.getAppPropertiesByAppNameUsingGET(this.appName).subscribe (
        (result) => {
          result.forEach((element) => {
                console.log('App_Properties_T name/value ' + element.propKey + '/' + element.propValue);
                this.appProperties[element.propKey] = element.propValue;
          });
          console.log('AppPropertiesService initialize Done');
          resolve();
        },
        (error) => {
          console.error('Failed to load App Properties because of error, ', error);
          reject();
        }
      );
      });
  }

  getProperty(name: string): string{
    if (this.overrideProperties && this.overrideProperties[name]){
      return this.overrideProperties[name];
    }
    else {
      return this.appProperties[name] ;
    }
  }

}

export const PROPERTIES_APP_NAME = new InjectionToken<string>('appName');
export const PROPERTIES_OVERRIDE = new InjectionToken<string>('overrideProperties');
