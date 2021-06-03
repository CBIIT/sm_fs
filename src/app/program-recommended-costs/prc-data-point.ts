/**
 * This class is a data structure to track the program recommended costs for a given request.
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
  recommendedDirect: number;
  recommendedTotal: number;
  percentCutDirectCalculated: number;
  percentCutTotalCalculated: number;
  percentCut: number;
  fundingSource: FundingRequestFundsSrcDto;
  grantAward: GrantAwardedDto;
  type: PrcLineItemType;
  baselineSource: PrcBaselineSource;
}
