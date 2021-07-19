import { Injectable } from '@angular/core';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  eGrantsUrl: string;
  allgrants: NciPfrGrantQueryDto[] = [];
  selectedGrants: NciPfrGrantQueryDto[] = [];
  unselectedGrants: NciPfrGrantQueryDto[] = [];
  skippedGrants: NciPfrGrantQueryDto[] = [];
  exceptionGrants: NciPfrGrantQueryDto[] = [];


  constructor(propertiesService: AppPropertiesService) {
    this.grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');

  }
}
