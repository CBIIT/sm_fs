import {Injectable} from '@angular/core';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../service/app-properties.service';

@Injectable({
  providedIn: 'root'
})
export class RequestModel {
  // Stores the grant selected in Step 1
  private _grant: NciPfrGrantQueryDto;

  // Holds the request title
  private _requestName: string;

  // Grant viewer URL for use in links
  private _grantViewerUrl: string;

  // Request type
  private _requestType: string;

  get requestType(): string {
    return this._requestType;
  }

  set requestType(value: string) {
    this._requestType = value;
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
