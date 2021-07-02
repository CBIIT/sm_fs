import { Injectable } from '@angular/core';
import { CancerActivityControllerService, LookupsControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class AppLookupsService {

  private lookups: { CancerActivities: any, AnotherLookupMap: any }
    = { CancerActivities: {}, AnotherLookupMap: {} };

  // for resolve and reject the promise
  private resolve: any;
  private reject: any;
  private cancerActivitiesLoaded = false;
  private dummyLookupMapLoaded = false;

  constructor(private cancerActivityController: CancerActivityControllerService, private logger: NGXLogger) {
  }

  loadCancerActivities(): void {
    this.cancerActivityController.getAllActiveCaListUsingGET().subscribe(
      (result) => {
        const cays = {};
        result.forEach((element) => {
          cays[element.code] = element.referralDescription;
        });
        this.lookups.CancerActivities = cays;
        this.cancerActivitiesLoaded = true;
        this.tryResolve();
      },
      (error) => {
        this.logger.error('Failed loading CanerActivities in AppLookupService for error, ', error);
        this.doReject();
      }
    );
  }

  tryResolve(): void {
    if (this.cancerActivitiesLoaded && this.dummyLookupMapLoaded) {
      this.resolve();
    }
  }

  doReject(): void {
    this.reject();
  }

  loadDummyLookupMap(): void {
    setTimeout(() => {
      this.dummyLookupMapLoaded = true;
      this.tryResolve();
    }, 100);
  }

  initialize(): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      this.dummyLookupMapLoaded = false;
      this.cancerActivitiesLoaded = false;
      this.resolve = resolve;
      this.reject = reject;
      this.loadCancerActivities();
      this.loadDummyLookupMap();
    });
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
