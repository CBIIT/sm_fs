import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProgramRecommendedCostsModel {
  private _fundingSources = new Array<FundingRequestFundsSrcDto>();
  private _fundingSourcesMap = new Map<number, FundingRequestFundsSrcDto>();

  get fundingSources(): FundingRequestFundsSrcDto[] {
    return this._fundingSources;
  }

  set fundingSources(value: FundingRequestFundsSrcDto[]) {
    this._fundingSources = value;
  }

  get fundingSourcesMap(): Map<number, FundingRequestFundsSrcDto> {
    return this._fundingSourcesMap;
  }

  set fundingSourcesMap(value: Map<number, FundingRequestFundsSrcDto>) {
    this._fundingSourcesMap = value;
  }


}
