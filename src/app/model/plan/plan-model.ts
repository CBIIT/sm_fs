import { Injectable } from '@angular/core';
import { FundingPlanDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  eGrantsUrl: string;
  catsConceptUrl: string;
  allGrants: NciPfrGrantQueryDto[] = [];
  selectedGrants: NciPfrGrantQueryDto[] = [];
  unselectedGrants: NciPfrGrantQueryDto[] = [];
  skippedGrants: NciPfrGrantQueryDto[] = [];
  exceptionGrants: NciPfrGrantQueryDto[] = [];

  fundingPlanDto: FundingPlanDto;

  // TODO: Generate FundingPlanDto and FundingPlanFoasDto

  title = 'New Funding Plan';


  constructor(propertiesService: AppPropertiesService) {
    this.grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this.catsConceptUrl = propertiesService.getProperty('CONCEPT_ID_URL');

  }

  reset(): void {
    this.allGrants = [];
    this.selectedGrants = [];
    this.unselectedGrants = [];
    this.skippedGrants = [];
    this.exceptionGrants = [];
  }
}
