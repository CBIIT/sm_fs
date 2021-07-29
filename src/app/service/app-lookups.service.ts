import { Injectable } from '@angular/core';
import { CancerActivityControllerService, LookupsControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class AppLookupsService {

  private lookups: { CancerActivities: any, NciDocs: any }
    = { CancerActivities: {}, NciDocs: {} };

  // for resolve and reject the promise
  private resolve: any;
  private reject: any;
  private cancerActivitiesLoaded = false;
  private nciDocsLoaded = false;

  constructor(
    private cancerActivityController: CancerActivityControllerService,
    private lookupController: LookupsControllerService,
    private logger: NGXLogger) {
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
        this.logger.error('Failed to load CanerActivities in AppLookupService for error, ', error);
        this.doReject();
      }
    );
  }

  tryResolve(): void {
    if (this.cancerActivitiesLoaded && this.nciDocsLoaded) {
      this.logger.debug('AppLookupsService loading is done', this.lookups);
      this.resolve();
    }
  }

  doReject(): void {
    this.reject();
  }

  loadNciDocs(): void {
    this.lookupController.getNciDocsUsingGET().subscribe(
      (result) => {
        const nciDocs = {};
        result.forEach((element) => {
          nciDocs[element.abbreviation] = element.description;
        });
        this.lookups.NciDocs = nciDocs;
        this.nciDocsLoaded = true;
        this.tryResolve();
      },
      (error) => {
        this.logger.error('Failed to load NciDocs in AppLookupService for error, ', error);
        this.doReject();
      }
    );
  }

  initialize(): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      this.nciDocsLoaded = false;
      this.cancerActivitiesLoaded = false;
      this.resolve = resolve;
      this.reject = reject;
      this.loadCancerActivities();
      this.loadNciDocs();
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
