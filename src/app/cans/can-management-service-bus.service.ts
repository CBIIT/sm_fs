import {Injectable, OnInit} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {
  CanCcxDto,
  FsCanControllerService,
  FundingRequestCanDto,
  FundingRequestGrantCanDto,
  OefiaCodingDto
} from '@nci-cbiit/i2ecws-lib';
import {RequestModel} from '../model/request-model';
import {Observable, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CanManagementServiceBus {

  oefiaTypeEmitter = new Subject<{ index: number; value: number }>();
  projectedCanEmitter = new Subject<{ index: number; can: CanCcxDto }>();
  selectedCanEmitter = new Subject<{ index: number; can: CanCcxDto }>();

  nciSourceFlag: string = null;
  defaultCans: Array<CanCcxDto>;
  grantCans: Array<FundingRequestGrantCanDto>;
  oefiaCodes: Array<OefiaCodingDto>;

  constructor(private logger: NGXLogger, private canService: FsCanControllerService,
              private requestModel: RequestModel) {
    this.refreshCans();
    this.refreshOefiaCodes();
  }

  refreshCans(): void {
    this.refreshDefaultCans();
    this.refreshGrantCans();
  }

  getProjectedCan(fseId: number, oefiaTypeId: number): Observable<CanCcxDto> {
    this.logger.debug('getProjectedCan(', this.requestModel.grant.applId, fseId, oefiaTypeId, this.requestModel.requestDto.frtId, ')');
    return this.canService.retrieveProjectedCanUsingGET(
      this.requestModel.grant.applId,
      fseId,
      oefiaTypeId,
      this.requestModel.requestDto.frtId);
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
      nciSourceFlag);
  }

  getRequestCans(frqId: number): Observable<FundingRequestCanDto[]> {
    return this.canService.getRequestCansUsingGET(frqId);
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
      this.logger.debug(result);
      this.defaultCans = result;
    }, error => {
      this.logger.error(error);
    });
    return true;
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

}
