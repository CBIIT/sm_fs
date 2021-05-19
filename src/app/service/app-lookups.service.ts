import { Inject, Injectable, InjectionToken } from '@angular/core';
import { CancerActivityControllerService, LookupsControllerService } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AppLookupsService {

  private lookups:{}={};

  constructor(private cancerActivityController:CancerActivityControllerService) {
  }

  delay = ms => new Promise(res => setTimeout(res, ms));

  async loadCancerActivities() {
    console.log('AppLookupsService loadCancerActivities starts');
    const result = await this.cancerActivityController.getAllActiveCaListUsingGET().toPromise();
    const cays = {};

    result.forEach((element) => {
      cays[element.code] = element.referralDescription;
    });
    console.log('cays', cays);
    this.lookups['CancerActivities'] = cays;
  }

  async initialize() {
    this.loadCancerActivities();
  }

  getDescription(listName: string, code: string): string {
    if (this.lookups[listName]) {
      return this.lookups[listName][code];
    }
    else {
      return null;
    }
  }

}
