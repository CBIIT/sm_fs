import { Injectable } from '@angular/core';
import { LookupsControllerService } from '@cbiit/i2ecommonws-lib';
import { CancerActivityControllerService } from '@cbiit/i2erefws-lib';
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
    this.cancerActivityController.getAllActiveCaList().subscribe(
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
      this.resolve();
    }
  }

  doReject(): void {
    this.reject();
  }

  loadNciDocs(): void {
    this.lookupController.getNciDocs().subscribe(
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
