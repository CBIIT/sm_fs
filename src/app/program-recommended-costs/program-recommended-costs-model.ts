import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {Injectable} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {PrcBaselineSource, PrcDataPoint, PrcLineItemType} from './prc-data-point';
import {GrantAwardedDto} from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {FundingRequestTypes, INITIAL_PAY_TYPES} from '../model/funding-request-types';

@Injectable({
  providedIn: 'root'
})
export class ProgramRecommendedCostsModel {

  fundingRequestType: number;
  prcLineItems = new Map<FundingRequestFundsSrcDto, PrcDataPoint[]>();
  private _fundingSources = new Array<FundingRequestFundsSrcDto>();
  private _fundingSourcesMap = new Map<number, FundingRequestFundsSrcDto>();

  // Used by the funding source component to filter out sources already used on this request
  private _selectedFundingSourceIds = new Set<number>();

  // Used by the program recommended costs component to track the details of the sources that have been selected
  private _selectedFundingSources = new Array<FundingRequestFundsSrcDto>();

  private _grantAwarded: Array<GrantAwardedDto>;

  constructor(private logger: NGXLogger) {
  }

  get grantAwarded(): Array<GrantAwardedDto> {
    return this._grantAwarded;
  }

  set grantAwarded(value: Array<GrantAwardedDto>) {
    this._grantAwarded = value;
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
    // this.logger.debug('Setting funding sources and preparing detail map');
    this._fundingSources = value;
    this._fundingSourcesMap = new Map(value.map(key => [key.fundingSourceId, key] as [number, FundingRequestFundsSrcDto]));
  }

  get fundingSourcesMap(): Map<number, FundingRequestFundsSrcDto> {
    return this._fundingSourcesMap;
  }

  set fundingSourcesMap(value: Map<number, FundingRequestFundsSrcDto>) {
    this._fundingSourcesMap = value;
  }

  deleteFundingSourceByIndex(index: number): number {
    const removed = this._selectedFundingSources[index];
    if (!removed) {
      this.logger.error('No funding source found for removal at index ', index);
    } else {
      this._selectedFundingSources.splice(index, 1);
      this.prcLineItems.delete(removed);
      this.logger.debug(this.prcLineItems);
    }
    return removed ? removed.fundingSourceId : -1;
  }

  addFundingSourceById(id: number, dataPoints: Array<PrcDataPoint>): boolean {
    const source = this._fundingSourcesMap.get(Number(id));
    if (!source) {
      return false;
    }
    if (!this._selectedFundingSources.includes(source)) {
      this._selectedFundingSources.push(source);
    }
    dataPoints.forEach(d => {
      d.fundingSource = source;
    });
    // const dataPoints = new Array<PrcDataPoint>();
    //
    // this.grantAwarded.forEach(ga => {
    //   const tmp = new PrcDataPoint();
    //   tmp.grantAward = ga;
    //   tmp.fundingSource = source;
    //   if (this.displayFormat() === PRC_DISPLAY_FORMAT.INITIAL_PAY) {
    //     tmp.baselineSource = PrcBaselineSource.PI_REQUESTED;
    //     tmp.type = PrcLineItemType.PERCENT_CUT;
    //     tmp.baselineDirect = ga.requestAmount;
    //     tmp.baselineTotal = ga.requestTotalAmount;
    //   } else {
    //     tmp.baselineSource = PrcBaselineSource.AWARDED;
    //     tmp.type = PrcLineItemType.PERCENT_CUT;
    //     tmp.baselineDirect = ga.directAmount;
    //     tmp.baselineTotal = ga.totalAwarded;
    //   }
    //   dataPoints.push(tmp);
    // });

    this.prcLineItems.set(source, dataPoints);
    this.logger.debug(this.prcLineItems);

    return true;
  }

  // This will only be useful on the main table, since the modal doesn't have a funding source yet
  getLineItemsForSource(src: FundingRequestFundsSrcDto): PrcDataPoint[] {
    // TODO: Error handling?
    return this.prcLineItems.get(src);
  }


}

export enum PRC_DISPLAY_FORMAT {
  INITIAL_PAY,
  RESTORATION_OF_FUTURE_YEAR,
  ADD_FUNDS,
  OTHER
}
