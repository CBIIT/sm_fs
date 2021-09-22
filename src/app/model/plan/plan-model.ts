import { Injectable } from '@angular/core';
import { CanCcxDto, FundingPlanDto, FundingRequestCanDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';
import { NciPfrGrantQueryDtoEx } from './nci-pfr-grant-query-dto-ex';
import { RfaPaNcabDate } from '@nci-cbiit/i2ecws-lib/model/rfaPaNcabDate';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  yourgrantsUrl: string;
  eGrantsUrl: string;
  catsConceptUrl: string;
  // allGrants array include 'selected' boolean column with is set on step 1
  allGrants: NciPfrGrantQueryDtoEx[] = [];
  grantsSearchCriteria: Array<RfaPaNcabDate> = [];
  // Data from Step 2
  minimumScore: number;
  maximumScore: number;

  fundingPlanDto: FundingPlanDto = {};
  selectedApplIdCans: Map<number, Map<number, CanCcxDto>> = new Map<number, Map<number, CanCcxDto>>();


  documentSnapshot: ModelSnapshot;

  // TODO: Generate FundingPlanDto and FundingPlanFoasDto

  title = 'New Plan';
  mainApproversCreated = false;
  approverCriteria: any;

  constructor(propertiesService: AppPropertiesService,
              private logger: NGXLogger) {
    // TODO: static properties should be set at app level and shared somehow
    this.grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this.yourgrantsUrl = propertiesService.getProperty('URL_YOURGRANTS');
    this.eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this.catsConceptUrl = propertiesService.getProperty('CONCEPT_ID_URL');

  }

  reset(): void {
    this.fundingPlanDto = {};
    this.allGrants = [];
    this.grantsSearchCriteria = [];
    this.minimumScore = 0;
    this.maximumScore = 0;
    this.takeDocumentSnapshot();
  }

  isMainApproversRegenNeeded(): boolean {
    // always regen for now. needs to figure out the criteria used for plan approvers.
    return true;
//    return this.mainApproversCreated && this.approverCriteriaChanged();
  }

  private approverCriteriaChanged(): boolean {
    const newCriteria = this.makeApproverCriteria();
    // this.logger.debug('new approver criteria ', newCriteria);
    // this.logger.debug('prior approver criteria ', this.approverCriteria);
    return newCriteria.requestType !== this.approverCriteria.requestType
      || newCriteria.cayCode !== this.approverCriteria.cayCode
      || newCriteria.fundingSources !== this.approverCriteria.fundingSources
      || newCriteria.otherDocs !== this.approverCriteria.otherDocs
      || newCriteria.loaCode !== this.approverCriteria.loaCode;
  }

  private makeApproverCriteria(): any {
    const approverCriteria: any = {};
    //  approverCriteria.requestType = this.fundingPlanDto.financialInfoDto.requestTypeId;
    approverCriteria.cayCode = this.fundingPlanDto.cayCode;
    approverCriteria.doc = this.fundingPlanDto.requestorDoc;
    // const fundingSources = Array.from(this.fundingPlanDto.fundingPlanFoas.map());
    // fundingSources.sort(); commented for now to make the order of
    // fundingSources important in determining if approvers need to be regen.
    // approverCriteria.fundingSources = fundingSources.join(',');
    approverCriteria.otherDocs = this.fundingPlanDto.otherContributingDocs;
    approverCriteria.loaCode = this.fundingPlanDto.loaCode;
    // from the create_main_approvers sp, it seems otherDocs has no effect on funding request approvers,
    // only affects funding plan approvers, needs double check with David and Subashini.
    return approverCriteria;
    return null;
  }

  markMainApproversCreated(): void {
    this.approverCriteria = this.makeApproverCriteria();
    this.mainApproversCreated = true;
  }

  private buildModelSnapshot(): ModelSnapshot {
    const snapshot: ModelSnapshot = new ModelSnapshot();
    const searchCriteria: Array<RfaPaNcabDate> = JSON.parse(JSON.stringify(this.grantsSearchCriteria));
    searchCriteria.sort((a, b) => a.rfaPaNumber.localeCompare(b.rfaPaNumber));
    searchCriteria.forEach(a => a.ncabDates.sort());
    snapshot.rfqNcabs = searchCriteria.map(a => '^' + a.rfaPaNumber + '#' + a.ncabDates.join('+')).join(',');
    snapshot.scoreRange = this.minimumScore + '-' + this.maximumScore;
    snapshot.selectedGrants =
      this.allGrants.filter(g => g.selected).map(g => g.applId).join(',');
    return snapshot;
  }

  documentSnapshotChanged(): boolean {
    const newSnapshot = this.buildModelSnapshot();
    // this.logger.debug('old documentSnapshot ', JSON.stringify(this.documentSnapshot));
    // this.logger.debug('new documentSnapshot ', JSON.stringify(newSnapshot));
    if (newSnapshot.rfqNcabs !== this.documentSnapshot?.rfqNcabs
      || newSnapshot.selectedGrants !== this.documentSnapshot?.selectedGrants
      || newSnapshot.scoreRange !== this.documentSnapshot?.scoreRange) {
      return true;
    } else {
      return false;
    }
  }

  takeDocumentSnapshot(): void {
    this.documentSnapshot = this.buildModelSnapshot();
  }

  get bmmCodeList(): string {
    const tmp = new Set(this.allGrants?.filter(g => g.selected).map(g => g.bmmCode));
    const arr: string[] = [];
    tmp.forEach(t => {
      arr.push(t);
    });
    return arr.join(',');
  }

  get activityCodeList(): string {
    return this.fundingPlanDto?.fundingPlanFoas[0]?.activityCodeList || '';
  }


  saveSelectedCAN(fseId: number, applId: number, can): void {
    if(!this.selectedApplIdCans) {
      this.selectedApplIdCans = new Map<number, Map<number, CanCcxDto>>();
    }

    const tmp = this.selectedApplIdCans.get(fseId) || new Map<number, CanCcxDto>();
    tmp.set(applId, can);
    this.selectedApplIdCans.set(fseId, tmp);
  }

  buildUpdatedCANDataModel(): FundingRequestCanDto[] {
    let c: CanCcxDto;
    const result: FundingRequestCanDto[] = [];
    this.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      req.financialInfoDto.fundingRequestCans.forEach(can => {
        c = this.selectedApplIdCans.get(can.fseId)?.get(req.applId);
        if (c) {
          can.can = c.can;
          can.canDescription = c.canDescrip;
          can.phsOrgCode = c.canPhsOrgCode;
        }
        result.push(can);
      });
    });
    return result;
  }
}

class ModelSnapshot {
  rfqNcabs: string;
  selectedGrants: string;
  scoreRange: string;
}
