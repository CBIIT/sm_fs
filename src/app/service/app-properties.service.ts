import { Inject, Injectable, InjectionToken } from '@angular/core';
import { LookupsControllerService } from 'i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AppPropertiesService {

  private appProperties:{}={}; 
  private overrideProperties:{}={};
  private appName:string='';


  constructor(private lookupService:LookupsControllerService,
    @Inject(PROPERTIES_APP_NAME) appName: string,
    @Inject(PROPERTIES_OVERRIDE) overrideProperties: any) { 
      this.appName=appName;
      this.overrideProperties=overrideProperties;
  }

  delay = ms => new Promise(res => setTimeout(res, ms));
  
   async initialize() {
    //await this.delay(5000);
    console.log("AppPropertiesService initialize Starts, appName="+this.appName);
    let result= await this.lookupService.getAppPropertiesByAppNameUsingGET(this.appName).toPromise();
  
    this.appProperties={};
    result.forEach((element) => {
          console.log("App_Properties_T name/value "+element.propKey+"/"+element.propValue);
          this.appProperties[element.propKey]=element.propValue
    });        

    console.log("AppPropertiesService initialize Done");  
  }

  getProperty(name:string):string{
    if (this.overrideProperties && this.overrideProperties[name])
      return this.overrideProperties[name];
    else
      return this.appProperties[name] ;
  }

}

export const PROPERTIES_APP_NAME = new InjectionToken<string>('appName');
export const PROPERTIES_OVERRIDE = new InjectionToken<string>('overrideProperties');
