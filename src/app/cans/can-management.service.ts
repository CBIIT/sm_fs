import { Injectable } from '@angular/core';
import {
  CanCcxDto,
  FsCanControllerService,
  FundingRequestCanDisplayDto,
  FundingRequestCanDto,
  OefiaCodingDto
} from '@cbiit/i2efsws-lib';
import { RequestModel } from '../model/request/request-model';
import { Observable, Subject } from 'rxjs';
import { PlanModel } from '../model/plan/plan-model';
import { CustomServerLoggingService } from '@cbiit/i2ecui-lib';
import { isNumeric } from '../utils/utils';
import { NGXLogger } from 'ngx-logger';

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
  oefiaCodes: Array<OefiaCodingDto>;
  cachedRequestCans: Map<number, FundingRequestCanDto[]> = new Map();
  activeCanCache: Map<string, CanCcxDto[]> = new Map<string, CanCcxDto[]>();
  canDisplayMatrix: Map<number, FundingRequestCanDisplayDto>;

  constructor(
    private logger: NGXLogger,
    private canService: FsCanControllerService,
    private requestModel: RequestModel,
    private planModel: PlanModel) {
    this.refreshOefiaCodes();
  }

  initializeCANDisplayMatrixForPlan(): void {
    const fseIds: number[] = this.planModel?.fundingPlanDto?.fpFinancialInformation?.fundingPlanFundsSources?.map(s => s.fundingSourceId);
    if (!fseIds || fseIds.length === 0) {
      return;
    }
    this.buildCanDisplayMatrix(fseIds);
//    this.logger.info(`Building CAN display matrix for plan ${this.planModel.fundingPlanDto.fprId}`);
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
      this.logger.debug(`CAN display matrix: ${JSON.stringify(result)}`);
    });
  }

  getFundingRequestCanDisplays(fseIds: number[]): Observable<FundingRequestCanDisplayDto[]> {
    return this.canService.getFundingRequestCanDisplays(fseIds);
  }

  getProjectedCan(fseId: number, oefiaTypeId: number, frtId: number, frqId: number, applId?: number): Observable<CanCcxDto> {
    if (!applId) {
      applId = this.requestModel?.grant?.applId;
    }

    if (!applId || !frtId || !fseId) {
      return new Observable(subscriber => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    this.logger.debug(`getProjectedCan(${fseId}, ${oefiaTypeId}, ${frtId}, ${frqId}, ${applId})`);
    return this.canService.retrieveProjectedCan(
      applId,
      frtId,
      fseId,
      oefiaTypeId,
      frqId
    );
  }

  getOefiaCodes(): Observable<OefiaCodingDto[]> {
    if (this.oefiaCodes && this.oefiaCodes.length > 0) {
      return new Observable(subscriber => {
        subscriber.next(this.oefiaCodes);
        subscriber.complete();
      });
    }

    const fn = this.canService.getOefiaTypes();
    fn.subscribe(result => {
      this.oefiaCodes = result;
    });

    return fn;
  }

  refreshOefiaCodes(): void {
    this.canService.getOefiaTypes().subscribe(result => {
      this.oefiaCodes = result;
    });
  }

  getDefaultCansWithExtra(nciSourceFlag: string, extra: string): Observable<CanCcxDto[]> {
    this.logger.info(`getDefaultCansWithExtra(${nciSourceFlag}, ${extra})`);
    if (!extra) {
      return this.searchDefaultCans(null, this.requestModel.requestDto.bmmCode, this.requestModel.requestDto.activityCode, nciSourceFlag);
    }
    return this.searchDefaultCansWithExtra(null, this.requestModel.requestDto.bmmCode, this.requestModel.requestDto.activityCode, nciSourceFlag, extra);
  }

  getRequestCans(frqId: number): Observable<FundingRequestCanDto[]> {
    const tmp = this.cachedRequestCans.get(frqId);
    if (tmp) {
      // this.logger.debug('returning cached request cans:', frqId);
      return new Observable(subscriber => {
        subscriber.next(tmp);
      });
    }

    const fn = this.canService.getRequestCans(frqId);
    fn.subscribe(result => {
      this.cachedRequestCans.set(frqId, result);
    });
    return fn;
  }

  searchDefaultCans(can: string, bmmCodes: string, activityCodes: string, nciSource: string): Observable<CanCcxDto[]> {
    this.logger.debug(`searchDefaultCans(${can}, ${bmmCodes}, ${activityCodes}, ${nciSource})`);
    // FS-1476 - for Pay Type 4 requests, use the conversion mech and related default BMM code.
    if(this.requestModel && this.requestModel.isPayType4() && this.requestModel.requestDto.conversionActivityCode && this.requestModel.requestDto.conversionActivityCode !== 'NC') {
      return this.canService.getType4DefaultCans(
        this.requestModel.requestDto.conversionActivityCode,
        nciSource,
        can);
    }
    return this.canService.getDefaultCans(bmmCodes, activityCodes, nciSource, can);
  }

  searchDefaultCansWithExtra(can: string, bmmCodes: string, activityCodes: string, nciSource: string, extra: string): Observable<CanCcxDto[]> {
    this.logger.debug(`searchDefaultCansWithExtera(${can}, ${bmmCodes}, ${activityCodes}, ${nciSource}, ${extra})`);
    // FS-1476 - for Pay Type 4 requests, use the conversion mech and related default BMM code.
    if(this.requestModel && this.requestModel.isPayType4() && this.requestModel.requestDto.conversionActivityCode && this.requestModel.requestDto.conversionActivityCode !== 'NC') {
      return this.canService.getType4DefaultCansWithExtra(
        this.requestModel.requestDto.conversionActivityCode,
        nciSource,
        can,
        extra);
    }
    return this.canService.getDefaultCansWithExtra(
      bmmCodes,
      activityCodes,
      nciSource,
      can,
      extra);
  }

  searchAllCans(can: string, bmmCodes: string, activityCodes: string, nciSource: string): Observable<CanCcxDto[]> {
    const key = [can.toLowerCase(), bmmCodes, activityCodes, nciSource].join('_');
    const result = this.activeCanCache.get(key);
    if (result && result.length !== 0) {
      return new Observable<CanCcxDto[]>(subscriber => {
        subscriber.next(result);
      });
    }

    const fn = this.canService.getAllCans(can, bmmCodes, activityCodes, nciSource);

    fn.subscribe(next => {
      this.activeCanCache.set(key, next);
    });

    return fn;
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
    return this.canService.getCanDetails(value);
  }

  isCanPercentSelected(can: FundingRequestCanDto): boolean {
    if (!can) {
      return false;
    }
    if (can.percentSelected) {
      return true;
    }
    // NOTE: this is deliberate. I hate JavaScript's truthiness/falsiness BS
    if(can.percentSelected === false) {
      return false;
    }
    this.logger.info(`Fall back to evaluating actual percent cut values for can ${JSON.stringify(can)}`);
    return (isNumeric(can.dcPctCut) && isNumeric(can.tcPctCut) && can.dcPctCut === can.tcPctCut && can.dcPctCut !== 0 && can.tcPctCut !== 0);

  }
}
