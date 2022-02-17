import { Injectable } from '@angular/core';
import {
  CanCcxDto,
  FsCanControllerService,
  FundingRequestCanDisplayDto,
  FundingRequestCanDto,
  FundingRequestGrantCanDto,
  OefiaCodingDto
} from '@cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { Observable, Subject } from 'rxjs';
import { PlanModel } from '../model/plan/plan-model';
import { CustomServerLoggingService } from '../logging/custom-server-logging-service';

@Injectable({
  providedIn: 'root'
})
export class CanManagementService {

  // Used by OEFIA type component to broadcast a new value
  oefiaTypeEmitter = new Subject<{ index: number; value: number; fseId?: number }>();
  // Used by the projected CAN component to broadcast an updated CAN after new OEFIA type chosen
  projectedCanEmitter = new Subject<{ index: number; can: CanCcxDto; fseId?: number; applId?: number }>();
  // Instructs all listeners to update their CAN to the selected value if fseId matches
  selectCANEmitter = new Subject<{ fseId: number; can: CanCcxDto; applId?: number, override: boolean }>();
  nonDefaultCanEventEmitter = new Subject<{ fseId: number, applId: number, nonDefault: boolean }>();

  nciSourceFlag: string = null;
  // TODO: evaluate for deletion
  defaultCans: Array<CanCcxDto>;
  grantCans: Array<FundingRequestGrantCanDto>;
  oefiaCodes: Array<OefiaCodingDto>;
  cachedRequestCans: Map<number, FundingRequestCanDto[]> = new Map();
  activeCanCache: Map<string, CanCcxDto[]> = new Map<string, CanCcxDto[]>();
  canDisplayMatrix: Map<number, FundingRequestCanDisplayDto>;


  constructor(
    private logger: CustomServerLoggingService,
    private canService: FsCanControllerService,
    private requestModel: RequestModel,
    private planModel: PlanModel) {
    this.refreshCans();
    this.refreshOefiaCodes();
  }

  refreshCans(): void {
    this.refreshDefaultCans();
    this.refreshGrantCans();
  }

  initializeCANDisplayMatrixForPlan(): void {
    const fseIds: number[] = this.planModel?.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources?.map(s => s.fundingSourceId);
    if (!fseIds || fseIds.length === 0) {
      return;
    }
    this.buildCanDisplayMatrix(fseIds);
    this.logger.info(`Building CAN display matrix for plan ${this.planModel.fundingPlanDto.fprId}`);
  }

  initializeCANDisplayMatrixForRequest(): void {
    const fseIds: number[] = Array.from(this.requestModel?.programRecommendedCostsModel?.selectedFundingSourceIds);
    if (!fseIds || fseIds.length === 0) {
      return;
    }
    this.buildCanDisplayMatrix(fseIds);
  }

  private buildCanDisplayMatrix(fseIds: number[]): void {
    this.getFundingRequestCanDisplays(fseIds).subscribe(result => {
      this.canDisplayMatrix = new Map(result.map(c => [c.fseId, c]));
      this.logger.info(`CAN display matrix: ${JSON.stringify(result)}`);
    });
  }

  getFundingRequestCanDisplays(fseIds: number[]): Observable<FundingRequestCanDisplayDto[]> {
    return this.canService.getFundingRequestCanDisplaysUsingGET(fseIds);
  }

  getProjectedCan(fseId: number, oefiaTypeId: number, frtId: number, frqId: number, applId?: number): Observable<CanCcxDto> {
    if (!applId) {
      applId = this.requestModel?.grant?.applId;
    }
    if (!applId || !frtId) {
      return new Observable(subscriber => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    return this.canService.retrieveProjectedCanUsingGET(
      applId,
      frqId,
      fseId,
      frtId,
      oefiaTypeId
      );
  }

  getOefiaCodes(): Observable<OefiaCodingDto[]> {
    if (this.oefiaCodes && this.oefiaCodes.length > 0) {
      return new Observable(subscriber => {
        subscriber.next(this.oefiaCodes);
        subscriber.complete();
      });
    }

    const fn = this.canService.getOefiaTypesUsingGET();
    fn.subscribe(result => {
      this.oefiaCodes = result;
    });

    return fn;
  }

  refreshOefiaCodes(): void {
    this.canService.getOefiaTypesUsingGET().subscribe(result => {
      this.oefiaCodes = result;
    });
  }

  getDefaultCans(nciSourceFlag: string): Observable<CanCcxDto[]> {
    return this.canService.getDefaultCansUsingGET(
      this.requestModel.requestDto.activityCode,
      this.requestModel.requestDto.bmmCode,
      null,
      nciSourceFlag);
  }

  getDefaultCansWithExtra(nciSourceFlag: string, extra: string): Observable<CanCcxDto[]> {
    if (!extra) {
      return this.canService.getDefaultCansUsingGET(
        this.requestModel.requestDto.activityCode,
        this.requestModel.requestDto.bmmCode,
        null,
        nciSourceFlag);
    }
    return this.canService.getDefaultCansWithExtraUsingGET(
      this.requestModel.requestDto.activityCode,
      this.requestModel.requestDto.bmmCode,
      null,
      extra,
      nciSourceFlag);
  }

  getRequestCans(frqId: number): Observable<FundingRequestCanDto[]> {
    const tmp = this.cachedRequestCans.get(frqId);
    if (tmp) {
      // this.logger.debug('returning cached request cans:', frqId);
      return new Observable(subscriber => {
        subscriber.next(tmp);
      });
    }

    const fn = this.canService.getRequestCansUsingGET(frqId);
    fn.subscribe(result => {
      this.cachedRequestCans.set(frqId, result);
    });
    return fn;
  }

  refreshDefaultCans(): boolean {
    if (!this.requestModel.requestDto.bmmCode || !this.requestModel.requestDto.activityCode) {
      // this.logger.debug('Not refreshing default cans due to missing bmmCode or activityCode');
      return false;
    }
    this.canService.getDefaultCansUsingGET(
      this.requestModel.requestDto.activityCode,
      this.requestModel.requestDto.bmmCode,
      this.nciSourceFlag).subscribe(result => {
      // this.logger.debug(result);
      this.defaultCans = result;
    }, error => {
      this.logger.logErrorWithContext(error, this.requestModel);
    });
    return true;
  }


  searchDefaultCans(can: string, bmmCodes: string, activityCodes: string, nciSource: string): Observable<CanCcxDto[]> {
    return this.canService.getDefaultCansUsingGET(activityCodes, bmmCodes, can, nciSource);
  }

  searchAllCans(can: string, bmmCodes: string, activityCodes: string, nciSource: string): Observable<CanCcxDto[]> {
    const key = [can.toLowerCase(), bmmCodes, activityCodes, nciSource].join('_');
    const result = this.activeCanCache.get(key);
    if (result && result.length !== 0) {
      return new Observable<CanCcxDto[]>(subscriber => {
        subscriber.next(result);
      });
    }

    const fn = this.canService.getAllCansUsingGET(activityCodes, bmmCodes, can, nciSource);

    fn.subscribe(next => {
      this.activeCanCache.set(key, next);
    });

    return fn;
  }

  refreshGrantCans(): boolean {
    if (!this.requestModel.grant || !this.requestModel.grant.applId) {
      return false;
    }
    this.canService.getGrantCansUsingGET(this.requestModel.grant.applId).subscribe(result => {
      this.grantCans = result;

    }, error => {
      this.logger.logErrorWithContext(error, this.requestModel.grant);
    });
    return true;
  }

  checkDefaultCANs(
    fseId: number,
    applId: number,
    activityCodeList: string,
    bmmCodeList: string,
    nciSourceFlag: string,
    can: string): void {
    if (!can) {
      this.nonDefaultCanEventEmitter.next({ applId, fseId, nonDefault: false });
      return;
    }
    this.searchDefaultCans('', bmmCodeList, activityCodeList, nciSourceFlag).subscribe(result => {
      const canNumbers = result?.map(c => c.can).filter(cc => !!cc) as string[];

      if (canNumbers?.length === 0) {
        this.nonDefaultCanEventEmitter.next({ applId, fseId, nonDefault: false });
        return;
      }

      this.nonDefaultCanEventEmitter.next({ applId, fseId, nonDefault: !canNumbers.includes(can) });
    });
  }

  getCanDetails(value: string): Observable<CanCcxDto> {
    return this.canService.getCanDetailsUsingGET(value);
  }
}
