import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {UserService} from '@nci-cbiit/i2ecui-lib';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class RequestModel {
  private _grant: NciPfrGrantQueryDto;
  private _title = 'RequestModel';

  get grant(): any {
    return this._grant;
  }

  set grant(value: any) {
    this._grant = value;
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  constructor() {
    this._grant = {};
  }

}
