import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {isArray} from 'rxjs/internal-compatibility';

@Component({
  selector: 'app-request-information',
  templateUrl: './request-information.component.html',
  styleUrls: ['./request-information.component.css']
})
export class RequestInformationComponent implements OnInit {

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');

  get requestName(): string {
    return this.requestModel.requestDto.requestName;
  }

  set requestName(value: string) {
    this.requestModel.requestDto.requestName = value;
  }

  get selectedRequestType(): number {
    return this.requestModel.requestDto.frtId;
  }

  set selectedRequestType(value: number) {
    this.requestModel.requestDto.frtId = value;
  }


  // TODO: this is just plain weird. The CA dropdown component selectedValue attribute is an array of strings,
  // so the setter and getter here are typed as arrays of strings. However, the value passed to the setter is
  // just a string, and even though _selectedCayCode is typed as a string[], if I try to assign it a string[]
  // value, it blows up at runtime.  Ditto the getter, which blows up at runtime if I try to return an array
  // of strings, but won't compile if I try to return a string.
  _selectedCayCode: string[] = (this.requestModel.requestDto.cayCode ? [this.requestModel.requestDto.cayCode] : []);

  get selectedCayCode(): string[] {
    return this._selectedCayCode;
  }

  /**
   * @param value
   */
  set selectedCayCode(value: string[]) {
    console.log('setSelectedCayCode', value, typeof value, isArray(value));

    if (isArray(value) && value[0]) {
      this.requestModel.requestDto.cayCode = value[0];
    } else if (typeof value === 'string' || value instanceof String) {
      console.log('This should not be happening.  The value parameter a string[]!');
      this.requestModel.requestDto.cayCode = String(value);
    } else {
      this.requestModel.requestDto.cayCode = undefined;
    }
    this._selectedCayCode = value;
  }

  get selectedPd(): number {
    return this.requestModel.requestDto.pdNpnId;
  }

  set selectedPd(value: number) {
    this.requestModel.requestDto.pdNpnId = value;
  }

  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService) {
  }

  ngOnInit(): void {
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }
}
