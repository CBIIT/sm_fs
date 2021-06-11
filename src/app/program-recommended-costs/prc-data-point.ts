/**
 * This class is a data structure to track the program recommended costs for a given request.  It is more or less
 * equivalent to the FundingReqBudgetsDto class.
 *
 * the PrcLineItemType enum tracks whether the user is providing a percent cut or straight-up values,
 * in which case we would need to calculate the direct and total percent cut values.
 *
 * The PrcBaselineSource enum tracks where to get the baseline figures to apply percent cuts or calculate them:
 * either from the PI requested values or the awarded values (on the grantAwarded field).
 *
 * The important outputs here are going to be the recommendedDirect and recommendedTotal fields, which will
 * either be provided or calculated, based on the type.
 *
 * Note: as of now, I'm still struggling to figure out how we will be able to properly edit these things, since we will only
 * be storing the baseline and recommended values in the DB. I guess we'll cross that bridge when we come to it... :)
 *
 * For each funding source, we will iterate over the list of grant awards and create one data point for each.  So a line
 * in the Program Recommended Costs table will have a collection of data points, one for each award year.
 *
 */
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {GrantAwardedDto} from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {isNumeric} from 'rxjs/internal-compatibility';
import {FundingReqBudgetsDto} from '@nci-cbiit/i2ecws-lib';

export enum PrcLineItemType {
  PERCENT_CUT,
  COST_BASIS,
}

export enum PrcBaselineSource {
  PI_REQUESTED,
  AWARDED
}

export class PrcDataPoint {
  baselineDirect: number;
  baselineTotal: number;
  private _recommendedDirect: number;
  private _recommendedTotal: number;
  percentCutDirectCalculated = 0.0;
  percentCutTotalCalculated = 0.0;
  private _percentCut: number;
  fundingSource: FundingRequestFundsSrcDto;
  grantAward: GrantAwardedDto;
  type: PrcLineItemType;
  baselineSource: PrcBaselineSource;
  budgetId: number;
  fundingRequestId: number;

  get recommendedDirect(): number {
    return this._recommendedDirect;
  }

  set recommendedDirect(value: number) {
    this._recommendedDirect = value;
    if (!this.baselineDirect || this.baselineDirect === 0) {
      return;
    }
    if (isNumeric(value)) {
      this.percentCutDirectCalculated = 1 - (value / this.baselineDirect);
    }
  }

  get recommendedTotal(): number {
    return this._recommendedTotal;
  }

  set recommendedTotal(value: number) {
    this._recommendedTotal = value;
    if (!this.baselineTotal || this.baselineTotal === 0) {
      return;
    }
    if (isNumeric(value)) {
      this.percentCutTotalCalculated = 1 - (value / this.baselineTotal);
    }
  }

  get percentCut(): number {
    return this._percentCut;
  }

  set percentCut(value: number) {
    this._percentCut = value;
    if (isNumeric(value)) {
      value = value / 100;
      this._recommendedDirect = Math.round((1 - value) * this.baselineDirect);
      this._recommendedTotal = Math.round((1 - value) * this.baselineTotal);

      this.percentCutTotalCalculated = 1 - (this._recommendedTotal / this.baselineTotal);
      this.percentCutDirectCalculated = 1 - (this._recommendedDirect / this.baselineDirect);
    }
  }


  asBudget(): FundingReqBudgetsDto {
    const result: FundingReqBudgetsDto = {};
    result.dcRecAmt = this._recommendedDirect;
    result.tcRecAmt = this._recommendedTotal;
    result.fseId = this.fundingSource.fundingSourceId;
    result.name = this.fundingSource.fundingSourceName;
    result.supportYear = this.grantAward.year;
    result.frqId = this.fundingRequestId;
    result.id = this.budgetId;
    return result;
  }

  // TODO - restore from budget
  fromBudget(b: FundingReqBudgetsDto): void {
    this.budgetId = b.id;
    this.fundingRequestId = b.frqId;
    this.recommendedDirect = b.dcRecAmt;
    this.recommendedTotal = b.tcRecAmt;
  }
}
