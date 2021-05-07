import {Injectable} from '@angular/core';
import {FundingRequestDtoReq, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../service/app-properties.service';

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
    this._requestDto = value;
  }

  get grant(): NciPfrGrantQueryDto {
    return this._grant;
  }

  set grant(value: NciPfrGrantQueryDto) {
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

  constructor(private propertiesService: AppPropertiesService) {
    this._grantViewerUrl = propertiesService.getProperty('GRANT_VIEWER_URL');
  }

}
