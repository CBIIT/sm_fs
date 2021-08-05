import { Injectable } from '@angular/core';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  eGrantsUrl: string;
  allGrants: NciPfrGrantQueryDto[] = [];
  selectedGrants: NciPfrGrantQueryDto[] = [];
  unselectedGrants: NciPfrGrantQueryDto[] = [];
  skippedGrants: NciPfrGrantQueryDto[] = [];
  exceptionGrants: NciPfrGrantQueryDto[] = [];

  title = 'New Funding Plan';


  constructor(propertiesService: AppPropertiesService) {
    this.grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');

  }

  reset(): void {
    this.allGrants = [];
    this.selectedGrants = [];
    this.unselectedGrants = [];
    this.skippedGrants = [];
    this.exceptionGrants = [];
  }
}
