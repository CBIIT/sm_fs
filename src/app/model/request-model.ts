import {Injectable} from '@angular/core';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class RequestModel {
  // Stores the grant selected in Step 1
  private _grant: NciPfrGrantQueryDto;

  // Holds the request title
  private _requestName = 'RequestModel';

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

  constructor() {
  }

}
