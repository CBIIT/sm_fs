import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { NGXLogger } from 'ngx-logger';
import { PrcDataPoint } from './prc-data-point';
import { GrantAwardedDto } from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';

// @Injectable({
//   providedIn: 'root'
// })
export class ProgramRecommendedCostsModel {

  fundingRequestType: number;
  prcLineItems = new Map<number, PrcDataPoint[]>();
  private _fundingSources = new Array<FundingRequestFundsSrcDto>();
  private _fundingSourcesMap = new Map<number, FundingRequestFundsSrcDto>();

  // Used by the funding source component to filter out sources already used on this request
  private _selectedFundingSourceIds = new Set<number>();

  // Used by the program recommended costs component to track the details of the sources that have been selected
  private _selectedFundingSources = new Array<FundingRequestFundsSrcDto>();

  public grantAwarded: Array<GrantAwardedDto>;

  deletedSources: number[] = [];

  // TODO - revisit this.
  // When the user changes PD or some other trigger value, we reset the PRC model. However, we can't just clear the
  // set of sources, we have to actively delete anything that's already been saved.
  reset(saved: boolean): void {
    this.prcLineItems = new Map<number, PrcDataPoint[]>();
    if (!saved) {
      this.deletedSources = [];
    } else {
      this._selectedFundingSourceIds?.forEach(n => {
        this.deletedSources.push(n);
      });
    }
    this._selectedFundingSourceIds = new Set<number>();
    this._selectedFundingSources = new Array<FundingRequestFundsSrcDto>();
  }

  deepReset(saved: boolean): void {
    this.reset(saved);
    this.fundingRequestType = undefined;
    this._fundingSources = new Array<FundingRequestFundsSrcDto>();
    this._fundingSourcesMap = new Map<number, FundingRequestFundsSrcDto>();
    this.grantAwarded = undefined;
  }

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
    this._fundingSources = value;
    this._fundingSourcesMap = new Map(value.map(key => [key.fundingSourceId, key] as [number, FundingRequestFundsSrcDto]));
  }

  get fundingSourcesMap(): Map<number, FundingRequestFundsSrcDto> {
    return this._fundingSourcesMap;
  }

  deleteFundingSourceByIndex(index: number, saved: boolean): number {
    const removed = this._selectedFundingSources[index];
    this.logger.debug('delete funding source:', index, removed, saved);
    if (!removed) {
      this.logger.warn('No funding source found for removal at index ', index);
    } else {
      this._selectedFundingSources.splice(index, 1);
      this.logger.debug(this.prcLineItems);
      this.prcLineItems.delete(removed.fundingSourceId);
      this.logger.debug(this.prcLineItems);
    }
    if (saved) {
      this.deletedSources.push(removed.fundingSourceId);
    }
    return removed ? removed.fundingSourceId : -1;
  }

  addFundingSourceById(id: number, dataPoints: Array<PrcDataPoint>): boolean {
    this.logger.debug('add source for id', id, dataPoints);
    const source = this._fundingSourcesMap.get(Number(id));
    if (!source) {
      this.logger.warn('no source found in', this._fundingSourcesMap);
      return false;
    }
    if (!this.isSelected(source)) {
      this._selectedFundingSources.push(source);
    }
    dataPoints.forEach(d => {
      d.fundingSource = source;
    });

    this.prcLineItems.set(Number(id), dataPoints);

    return true;
  }

  isSelected(source: FundingRequestFundsSrcDto): boolean {
    if (!this._selectedFundingSources || this._selectedFundingSources.length === 0) {
      return false;
    }
    let result = false;
    this._selectedFundingSources.forEach(s => {
      if (s.fundingSourceId === source.fundingSourceId) {
        result = true;
      }
    });

    return result;
  }

  // This will only be useful on the main table, since the modal doesn't have a funding source yet
  getLineItemsForSource(src: FundingRequestFundsSrcDto): PrcDataPoint[] {
    return this.getLineItemsForSourceId(Number(src.fundingSourceId));
  }

  getLineItemsForSourceId(id: number): PrcDataPoint[] {
    const tmp = this.prcLineItems.get(Number(id));
    if (tmp?.length > this.grantAwarded.length) {
      this.logger.error('==========> more datapoints than grant years - data dump follows <==========');
      this.logger.debug('tmp:', tmp.length, '> ga:', this.grantAwarded.length);
      this.logger.error('======> source id', id);
      this.logger.error('======> all sources');
      this.logger.error(JSON.stringify(this.selectedFundingSources));
      this.logger.error('======> line items map');
      this.prcLineItems.forEach((val, key) => {
        this.logger.error(key, '::', val, '::', JSON.stringify(val));
      });
      this.logger.error(JSON.stringify(tmp));
      this.logger.error('======> grant awards');
      this.logger.error(JSON.stringify(this.grantAwarded));
      this.logger.error('======> prc model');
      this.logger.error(JSON.stringify(this));
      this.logger.error('==========> data dump ends <==========');

      tmp.splice(this.grantAwarded.length);
    }

    return tmp;
  }
}

export enum PRC_DISPLAY_FORMAT {
  INITIAL_PAY,
  RESTORATION_OF_FUTURE_YEAR,
  ADD_FUNDS,
  OTHER
}
