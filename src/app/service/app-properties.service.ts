import { Inject, Injectable, InjectionToken, OnInit } from '@angular/core';
import { LookupsControllerService } from 'i2ecws-lib';
import { ObjectUnsubscribedError, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppPropertiesService {

  private appProperties:{}={}; 
  private appName:string='';

  constructor(private lookupService:LookupsControllerService,
    @Inject(APP_NAME) appName: string) { 
      this.appName=appName;
  }

   async initialize() {
    if (Object.keys(this.appProperties).length>0)
      return;

    console.log("getAppProperties for appName="+this.appName);
    let result= await this.lookupService.getAppPropertiesByAppNameUsingGET(this.appName).toPromise();
  
    this.appProperties={};
    result.forEach((element) => {
          console.log("App_Properties_T name/value "+element.propKey+" "+element.propValue);
          this.appProperties[element.propKey]=element.propValue
    });        
    
    for (var a in environment)  {
          console.log("environment name/value="+a+'/'+environment[a] );
          this.appProperties[a]=environment[a];
    }
    console.log("AppPropertiesService initialize ENDS");  
  }

  async getProperty(name:string):Promise<string>{
    await this.initialize();
    return this.appProperties[name] ;
  }

}

export const APP_NAME = new InjectionToken<string>('appName');
