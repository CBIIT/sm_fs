import {Injectable, OnInit} from "@angular/core";
import {NGXLogger} from "ngx-logger";
import {CanCcxDto, FsCanControllerService, FundingRequestGrantCanDto, OefiaCodingDto} from "@nci-cbiit/i2ecws-lib";
import {RequestModel} from "../model/request-model";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CanManagementService implements OnInit {

  nciSourceFlag = '';
  defaultCans: Array<CanCcxDto>;
  grantCans: Array<FundingRequestGrantCanDto>;
  oefiaCodes: Array<OefiaCodingDto>;

  constructor(private logger: NGXLogger, private canService: FsCanControllerService,
              private requestModel: RequestModel) {
  }

  ngOnInit() {
    this.refreshCans();
    this.refreshOefiaCodes();
  }

  refreshCans(): void {
    this.refreshDefaultCans();
    this.refreshGrantCans();
  }

  getProjectedCan(fseId: number, oefiaTypeId: number): Observable<CanCcxDto> {
    return this.canService.retrieveProjectedCanUsingGET(
      this.requestModel.grant.applId,
      fseId, oefiaTypeId,
      this.requestModel.requestDto.frtId);
  }

  refreshOefiaCodes(): void {
    this.logger.debug('refreshing OEFIA codes')
    this.canService.getOefiaTypesUsingGET().subscribe(result => {
      this.oefiaCodes = result;
    });
  }

  refreshDefaultCans(): boolean {
    if (!this.requestModel.requestDto.bmmCode || !this.requestModel.requestDto.activityCode) {
      this.logger.debug('Not refreshing default cans due to missing bmmCode or activityCode');
      return false;
    }
    this.canService.getDefaultCansUsingGET(
      this.requestModel.requestDto.activityCode,
      this.requestModel.requestDto.bmmCode,
      this.nciSourceFlag).subscribe(result => {
      this.defaultCans = result;
    }, error => {
      this.logger.error(error);
    });
    return true;
  }

  refreshGrantCans(): boolean {
    if (!this.requestModel.grant || !this.requestModel.grant.applId) {
      this.logger.debug('Not refreshing grant cans due to missing applId');
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
