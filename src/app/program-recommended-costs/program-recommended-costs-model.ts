import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {Injectable} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {PrcDataPoint} from './prc-data-point';

@Injectable({
  providedIn: 'root'
})
export class ProgramRecommendedCostsModel {

  prcLineItems: Map<FundingRequestFundsSrcDto, PrcDataPoint[]>;
  private _fundingSources = new Array<FundingRequestFundsSrcDto>();
  private _fundingSourcesMap = new Map<number, FundingRequestFundsSrcDto>();

  // Used by the funding source component to filter out sources already used on this request
  private _selectedFundingSourceIds = new Set<number>();

  // Used by the program recommended costs component to track the details of the sources that have been selected
  private _selectedFundingSources = new Array<FundingRequestFundsSrcDto>();

  constructor(private logger: NGXLogger) {
  }

  get selectedFundingSourceIds(): Set<number> {
    return this._selectedFundingSourceIds;
  }

  set selectedFundingSourceIds(value: Set<number>) {
    this._selectedFundingSourceIds = value;
  }

  get selectedFundingSources(): FundingRequestFundsSrcDto[] {
    return this._selectedFundingSources;
  }

  set selectedFundingSources(value: FundingRequestFundsSrcDto[]) {
    this._selectedFundingSources = value;
  }

  get fundingSources(): FundingRequestFundsSrcDto[] {
    return this._fundingSources;
  }

  set fundingSources(value: FundingRequestFundsSrcDto[]) {
    this.logger.debug('Setting funding sources and preparing detail map');
    this._fundingSources = value;
    this._fundingSourcesMap = new Map(value.map(key => [key.fundingSourceId, key] as [number, FundingRequestFundsSrcDto]));
  }

  get fundingSourcesMap(): Map<number, FundingRequestFundsSrcDto> {
    return this._fundingSourcesMap;
  }

  set fundingSourcesMap(value: Map<number, FundingRequestFundsSrcDto>) {
    this._fundingSourcesMap = value;
  }


}
