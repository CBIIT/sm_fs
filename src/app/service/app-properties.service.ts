import { Injectable, OnInit } from '@angular/core';
import { LookupsControllerService } from 'i2ecws-lib';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppPropertiesService {

  private appProperties=<any>{}; 

  constructor(private lookupService:LookupsControllerService) { }

  async initialize2() {
    console.log("AppPropertiesService initialize STARTS");
    let result= await this.lookupService.getAppPropertiesByAppNameUsingGET('FUNDING_SELECTIONS').toPromise();
  
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

  async initialize() :Promise<boolean>{
    console.log("AppPropertiesService initialize STARTS");
    this.lookupService.getAppPropertiesByAppNameUsingGET('GREENSHEETS')
    .subscribe (
      function (result) {
        this.appProperties={};
        result.forEach((element) => {
          console.log("appProp "+element.propKey+" "+element.propValue);
          this.appProperties[element.propKey]=element.propValue
        });        
        for (var a in environment)  {
          console.log("propname="+a);
          console.log("propvalue="+environment[a]);
          this.appProperties[a]=environment[a];
        }
        return of(true).toPromise();
      },
      error => {
        console.log( 'lookupsService.getAppPropertiesByAppName failed ----- '
        + error.message)
        return of(false).toPromise();
      }
      );
    console.log("AppPropertiesService initialize ENDS");  
    return of(false).toPromise();
}

  getProperty(name:string):string {
    return this.appProperties[name]  ;
  }

}
