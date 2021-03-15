import { Inject, Injectable, InjectionToken, OnInit } from '@angular/core';
import { LookupsControllerService } from 'i2ecws-lib';
import { environment } from '../../environments/environment';

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

   async initialize() {

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
