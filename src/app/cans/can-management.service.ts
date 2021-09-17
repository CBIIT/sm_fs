import { Injectable, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import {
  CanCcxDto,
  FsCanControllerService,
  FundingRequestCanDto,
  FundingRequestGrantCanDto,
  OefiaCodingDto
} from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CanManagementService {

  oefiaTypeEmitter = new Subject<{ index: number; value: number }>();
  projectedCanEmitter = new Subject<{ index: number; can: CanCcxDto }>();
  selectedCanEmitter = new Subject<{ index: number; can: CanCcxDto }>();

  nciSourceFlag: string = null;
  defaultCans: Array<CanCcxDto>;
  grantCans: Array<FundingRequestGrantCanDto>;
  oefiaCodes: Array<OefiaCodingDto>;
  cachedRequestCans: Map<number, FundingRequestCanDto[]> = new Map();
  activeCanCache: Map<string, CanCcxDto[]> = new Map<string, CanCcxDto[]>();


  constructor(private logger: NGXLogger, private canService: FsCanControllerService,
              private requestModel: RequestModel) {
    this.refreshCans();
    this.refreshOefiaCodes();
    this.getActiveCans('', 'Y');
    this.getActiveCans('', 'N');
  }

  refreshCans(): void {
    this.refreshDefaultCans();
    this.refreshGrantCans();
  }

  getProjectedCan(fseId: number, oefiaTypeId: number, frtId: number, applId?: number): Observable<CanCcxDto> {
    if (!applId) {
      applId = this.requestModel.grant.applId;
    }
    return this.canService.retrieveProjectedCanUsingGET(
      applId,
      fseId,
      frtId,
      oefiaTypeId);
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

  getCans(nciSourceFlag: string): Observable<CanCcxDto[]> {
    return this.canService.getDefaultCansUsingGET(
      this.requestModel.requestDto.activityCode,
      this.requestModel.requestDto.bmmCode,
      null,
      nciSourceFlag);
  }

  getAllCans(nciSourceFlag: string): Observable<CanCcxDto[]> {
    return this.canService.getAllCansUsingGET(
      this.requestModel.requestDto.activityCode,
      this.requestModel.requestDto.bmmCode,
      null,
      nciSourceFlag
    );
  }

  getRequestCans(frqId: number): Observable<FundingRequestCanDto[]> {
    const tmp = this.cachedRequestCans.get(frqId);
    if (tmp) {
      this.logger.debug('returning cached request cans:', frqId);
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
      this.logger.error(error);
    });
    return true;
  }


  getActiveCans(can: string, nciSource: string): Observable<CanCcxDto[]> {
    if (!can) {
      can = '';
    }
    const tmp = this.activeCanCache.get(can + '_' + nciSource);
    if (tmp) {
      return new Observable(subscriber => {
        subscriber.next(tmp);
      });
    }
    this.logger.warn('getActiveCans from API', can, nciSource);
    const fn = this.canService.getActiveCansUsingGET(can, nciSource);
    fn.subscribe(result => {
      this.activeCanCache.set(can + '_' + nciSource, result);
    });

    return fn;
  }

  refreshGrantCans(): boolean {
    if (!this.requestModel.grant || !this.requestModel.grant.applId) {
      // this.logger.debug('Not refreshing grant cans due to missing applId');
      return false;
    }
    this.canService.getGrantCansUsingGET(this.requestModel.grant.applId).subscribe(result => {
      this.grantCans = result;

    }, error => {
      this.logger.error(error);
    });
    return true;
  }

  getCanDetails(value: string): Observable<CanCcxDto> {
    return this.canService.getCanDetailsUsingGET(value);
  }
}
