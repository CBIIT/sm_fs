import { FundingRequestFundsSrcDto } from '@cbiit/i2efsws-lib/model/fundingRequestFundsSrcDto';

export interface FundingSourceGrantDataPayload {
  frqId: number;
  budgetId: number;
  canId: number;
  applId: number;
  supportYear: number;
  fseId: number;
  fundingSourceName: string;
  octId: number;
  nciSourceFlag: string;
  baselineDirectCost: number;
  baselineTotalCost: number;
  directCost: number;
  totalCost: number;
  percentCut: number;
  directCostCalculated: number;
  totalCostCalculated: number;
  dcPercentCutCalculated: number;
  tcPercentCutCalculated: number;
  displayType: string;
  can?: string;
  canDescription?: string;
  canPhsOrgCode?: string;
  fundingSource: FundingRequestFundsSrcDto;
}
