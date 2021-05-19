import {Injectable} from '@angular/core';
import {FundingRequestDtoReq, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../service/app-properties.service';
import {hasOwnProperty} from 'src/app/utils/utils';


@Injectable({
  providedIn: 'root'
})
export class RequestModel {

  // Stores the grant selected in Step 1
  private _grant: NciPfrGrantQueryDto;

  // Note that swagger generated two versions of the DTO, one for the request and one for the response.  But they are identical.
  private _requestDto: FundingRequestDtoReq;

  // Holds the request title
  private _requestName: string;

  // Grant viewer URL for use in links
  private _grantViewerUrl: string;

  // Request type
  private _requestType: string;

  // Request comments
  private _requestComments: string;
  private _eGrantsUrl: string;


  get requestComments(): string {
    return this._requestComments;
  }

  set requestComments(value: string) {
    this._requestComments = value;
  }

  get requestType(): string {
    return this._requestType;
  }

  set requestType(value: string) {
    this._requestType = value;
  }

  get requestDto(): FundingRequestDtoReq {
    return this._requestDto;
  }

  set requestDto(value: FundingRequestDtoReq) {
    console.log('model updated with new FundingRequest data.  Redistribute fields as necessary.');
    this._requestDto = value;
  }

  get grant(): NciPfrGrantQueryDto {
    return this._grant;
  }


  set grant(value: NciPfrGrantQueryDto) {
    console.log('setting grant on request model - propagate properties as necessary');
    // TODO: map appropriate values from grant to requestDto
    this._requestDto.applId = value.applId;
    if (!this._requestDto.financialInfoDto) {
      this._requestDto.financialInfoDto = {};
    }
    // Object.keys(value).forEach(key => {
    //   if (hasOwnProperty(this.requestDto.financialInfoDto, key)) {
    //     this.requestDto.financialInfoDto[key] = value[key];
    //   }
    // });

    this._requestDto.financialInfoDto.applId = value.applId;
    this._requestDto.financialInfoDto.fy = value.fy;
    this._grant = value;
  }

  get requestName(): string {
    return this._requestName;
  }

  set requestName(value: string) {
    this._requestName = value;
  }

  get grantViewerUrl(): string {
    return this._grantViewerUrl;
  }

  get eGrantsUrl(): string {
    return this._eGrantsUrl;
  }

  constructor(private propertiesService: AppPropertiesService) {
    this._grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
    this._eGrantsUrl = propertiesService.getProperty('EGRANTS_URL');
    this._requestDto = {};
    this._requestDto.financialInfoDto = {};
  }

  canSave(): boolean {
    // TODO: implement validation rules here
    if (!this.requestDto.requestName || this.requestDto.requestName.trim().length === 0) {
      return false;
    }

    if (!this.requestDto.frtId) {
      return false;
    }

    if (!this.requestDto.pdNpnId) {
      return false;
    }

    if (!this.requestDto.requestorNpnId) {
      return false;
    }

    if (!this.requestDto.requestorCayCode || this.requestDto.requestorCayCode.trim().length === 0) {
      return false;
    }

    return true;
  }

  canSubmit(): boolean {
    // TODO: implement validation rules here
    return true;
  }

  reset(): void {
    this._requestDto = {};
    this._requestDto.financialInfoDto = {};
  }
}



