import { Injectable } from '@angular/core';
import { CanCcxDto, FundingPlanDto, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';
import { NciPfrGrantQueryDtoEx, orderByPriorityAndPI } from './nci-pfr-grant-query-dto-ex';
import { RfaPaNcabDate } from '@nci-cbiit/i2ecws-lib/model/rfaPaNcabDate';
import { NGXLogger } from 'ngx-logger';
import { Alert } from 'src/app/alert-billboard/alert';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grantViewerUrl: string;
  yourgrantsUrl: string;
  eGrantsUrl: string;
  catsConceptUrl: string;
  // allGrants array include 'selected' boolean column with is set on step 1
  private _allGrants: NciPfrGrantQueryDtoEx[] = [];
  grantsSearchCriteria: Array<RfaPaNcabDate> = [];
  // Data from Step 2
  minimumScore: number;
  maximumScore: number;

  fundingPlanDto: FundingPlanDto = {};
  selectedApplIdCans: Map<string, CanCcxDto> = new Map<string, CanCcxDto>();


  documentSnapshot: ModelSnapshot;

  // TODO: Generate FundingPlanDto and FundingPlanFoasDto
  title = 'New Plan';
  mainApproversCreated = false;
  approverCriteria: any;
  // controls whether to dispay return to search at the top of step6.
  returnToSearchLink = false;
  pendingAlerts: Alert[] = [];

  constructor(propertiesService: AppPropertiesService,
              private logger: NGXLogger) {
    // TODO: static properties should be set at app level and shared somehow
    this.grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this.yourgrantsUrl = propertiesService.getProperty('URL_YOURGRANTS');
    this.eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this.catsConceptUrl = propertiesService.getProperty('CONCEPT_ID_URL');

  }

  get allGrants(): NciPfrGrantQueryDtoEx[] {
    return this._allGrants.sort(orderByPriorityAndPI);
  }

  set allGrants(value: NciPfrGrantQueryDtoEx[]) {
    this._allGrants = value;
  }

  reset(): void {
    this.fundingPlanDto = {};
    this._allGrants = [];
    this.grantsSearchCriteria = [];
    this.minimumScore = 0;
    this.maximumScore = 0;
    this.returnToSearchLink = false;
    this.title = 'New Plan';
    this.pendingAlerts = [];
    this.takeDocumentSnapshot();
  }

  sortGrantsByPriorityAndPI(): void {
    if (this._allGrants) {
      this._allGrants.sort(orderByPriorityAndPI);
    }
  }

  isMainApproversRegenNeeded(): boolean {
    const newCriteria = this.makeApproverCriteria();
    return true;
  }

  private approverCriteriaChanged(): boolean {
    const newCriteria = this.makeApproverCriteria();
    return newCriteria.requestType !== this.approverCriteria.requestType
      || newCriteria.cayCode !== this.approverCriteria.cayCode
      || newCriteria.fundingSources !== this.approverCriteria.fundingSources
      || newCriteria.otherDocs !== this.approverCriteria.otherDocs
      || newCriteria.loaCode !== this.approverCriteria.loaCode;
  }

  private makeApproverCriteria(): any {
    const approverCriteria: any = {};
    approverCriteria.cayCode = this.fundingPlanDto.cayCode;
    approverCriteria.doc = this.fundingPlanDto.requestorDoc;
    approverCriteria.otherDocs = this.fundingPlanDto.otherContributingDocs;
    approverCriteria.loaCode = this.fundingPlanDto.loaCode;
    return approverCriteria;
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
      this._allGrants.filter(g => g.selected).map(g => g.applId).join(',');
    return snapshot;
  }

  documentSnapshotChanged(): boolean {
    const newSnapshot = this.buildModelSnapshot();
    return newSnapshot.rfqNcabs !== this.documentSnapshot?.rfqNcabs
      || newSnapshot.selectedGrants !== this.documentSnapshot?.selectedGrants
      || newSnapshot.scoreRange !== this.documentSnapshot?.scoreRange;
  }

  takeDocumentSnapshot(): void {
    this.documentSnapshot = this.buildModelSnapshot();
  }

  get bmmCodeList(): string {
    const tmp = new Set(this._allGrants?.filter(g => g.selected).map(g => g.bmmCode));
    const arr: string[] = [];
    tmp.forEach(t => {
      arr.push(t);
    });
    return arr.join(',');
  }

  get activityCodeList(): string {
    return this.fundingPlanDto?.fundingPlanFoas[0]?.activityCodeList || '';
  }

  isCanSelected(fseId: number): boolean {
    let result = false;

    // @ts-ignore
    this.selectedApplIdCans.forEach((v, k) => {
      if (v) {
        this.logger.debug(`${fseId}, ${k}, ${k.startsWith(String(fseId))}`);
        if (k.startsWith(String(fseId))) {
          result = true;
        }
      }
    });

    return result;
  }

  getSelectedCan(fseId: number, applId: number): CanCcxDto {
    const key = String(fseId) + '-' + String(applId);
    return this.selectedApplIdCans.get(key);
  }

  saveSelectedCAN(fseId: number, applId: number, can: CanCcxDto): void {
    if (!this.selectedApplIdCans) {
      this.selectedApplIdCans = new Map<string, CanCcxDto>();
    }
    const key = String(fseId) + '-' + String(applId);

    this.selectedApplIdCans.set(key, can);
  }

  sanitizeCANDataAfterReturn(): FundingRequestCanDto[] {
    const result: FundingRequestCanDto[] = [];
    this.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      req.financialInfoDto.fundingRequestCans.forEach(can => {
        can.can = null;
        can.canDescription = null;
        can.phsOrgCode = null;
        result.push(can);
      });
    });
    return result;
  }

  buildUpdatedCANDataModel(): FundingRequestCanDto[] {
    let c: CanCcxDto;
    const result: FundingRequestCanDto[] = [];
    this.fundingPlanDto.fpFinancialInformation.fundingRequests.forEach(req => {
      req.financialInfoDto.fundingRequestCans.forEach(can => {
        const key = String(can.fseId) + '-' + String(req.applId);
        if (!can.approvedDc || !can.approvedTc) {
          this.logger.error('CAN error :: no TC/DC values', can);
        }

        c = this.selectedApplIdCans.get(key);
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

  clearAlerts(): void {
    this.pendingAlerts = [];
  }
}

class ModelSnapshot {
  rfqNcabs: string;
  selectedGrants: string;
  scoreRange: string;
}
