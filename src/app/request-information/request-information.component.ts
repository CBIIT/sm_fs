import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {isArray} from 'rxjs/internal-compatibility';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestValidationService} from '../model/funding-request-validation-service';
import {FundingRequestErrorCodes} from '../model/funding-request-error-codes';

@Component({
  selector: 'app-request-information',
  templateUrl: './request-information.component.html',
  styleUrls: ['./request-information.component.css']
})
export class RequestInformationComponent implements OnInit {

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

  set selectedCayCode(value: string[]) {

    let testVal = '';
    if (isArray(value) && value[0]) {
      this.requestModel.requestDto.requestorCayCode = value[0];
      testVal = value[0];
    } else if (typeof value === 'string' || value instanceof String) {
      // console.log('This should not be happening.  The value parameter a string[]!');
      this.requestModel.requestDto.requestorCayCode = String(value);
      testVal = String(value);
    } else {
      this.requestModel.requestDto.requestorCayCode = undefined;
    }
    // TODO: FS-163 - display an error message if user selects 'MB' for type 9 or 1001 request types
    if ([9, 1001].includes(Number(this.requestModel.requestDto.frtId))) {
      if (testVal === 'MB') {
        this.fundingRequestValidationService.raiseError.next(
          FundingRequestErrorCodes.MUST_SELECT_DIVERSITY_SUPPLEMENT_FOR_MB);
        this.logger.error('You must select Diversity Supplement (includes CURE Supplements) as the request type');
      }
    }
    this._selectedCayCode = value;
  }

  get selectedPd(): number {
    return this.requestModel.requestDto.pdNpnId;
  }

  set selectedPd(value: number) {
    this.requestModel.requestDto.pdNpnId = value;
    this.requestModel.requestDto.requestorNpnId = value;
  }

  constructor(private requestModel: RequestModel, private logger: NGXLogger,
              private fundingRequestValidationService: FundingRequestValidationService) {
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
