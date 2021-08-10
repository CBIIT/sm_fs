import { Injectable } from '@angular/core';
import { FundingPlanDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';
import {NciPfrGrantQueryDtoEx} from "./nci-pfr-grant-query-dto-ex";
import {RfaPaNcabDate} from "@nci-cbiit/i2ecws-lib/model/rfaPaNcabDate";

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  eGrantsUrl: string;
  catsConceptUrl: string;
  // allGrants array include 'selected' boolean column with is set on step 1
  allGrants: NciPfrGrantQueryDtoEx[] = [];
  selectedGrants: NciPfrGrantQueryDto[] = [];
  unselectedGrants: NciPfrGrantQueryDto[] = [];
  skippedGrants: NciPfrGrantQueryDto[] = [];
  exceptionGrants: NciPfrGrantQueryDto[] = [];
  grantsSearchCriteria: Array<RfaPaNcabDate> = [];
  // Data from Step 2
  minimumScore: number;
  maximumScore: number;

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
    this.grantsSearchCriteria = [];
    this.minimumScore = 0;
    this.maximumScore = 0;
  }
}
