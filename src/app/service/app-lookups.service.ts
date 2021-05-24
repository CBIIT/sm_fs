import { Injectable} from '@angular/core';
import { CancerActivityControllerService, LookupsControllerService } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AppLookupsService {

  private lookups: {CancerActivities: any, AnptherLookupMap: any}
                   = {CancerActivities: {}, AnptherLookupMap: {} };

  // for resolve and reject the promise
  private resolve: any;
  private reject: any;
  private cancerActivitiesLoaded = false;
  private dummyLookupMapLoaded = false;

  constructor(private cancerActivityController: CancerActivityControllerService) {
  }

  loadCancerActivities(): void {
    // console.log('AppLookupsService loadCancerActivities starts');
    this.cancerActivityController.getAllActiveCaListUsingGET().subscribe(
      (result) => {
        const cays = {};
        result.forEach((element) => {
          cays[element.code] = element.referralDescription;
        });
        this.lookups.CancerActivities = cays;
        // console.log('AppLookupsService loadCancerActivities done', cays);
        this.cancerActivitiesLoaded = true;
        this.tryResolve();
      },
      (error) => {
        console.error('Failed loading CanerActivities in AppLookupService for error, ', error);
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
    // Simulate another load, let it delay 1/10 seconds;
    // console.log('AppLookupsService loadDummyLookupMap starts');
    setTimeout(() => {
      // console.log('AppLookupsService loadDummyLookupMap done');
      this.dummyLookupMapLoaded = true;
      this.tryResolve();
    }, 100);
  }

  initialize(): Promise<any> {
    return new Promise<void>( (resolve, reject) => {
      // console.log('AppLookupsService starts');
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
