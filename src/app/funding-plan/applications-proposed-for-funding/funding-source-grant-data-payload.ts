/**
 * TODO: incorporate into ApplicationsProposedForFunding component
 *
 */
export interface FundingSourceGrantDataPayload {
  applId: number;
  fseId: number;
  baselineDirectCost?: number;
  baselineTotalCost?: number;
  directCost: number;
  totalCost: number;
  percentCut: number;
  directCostCalculated?: number;
  totalCostCalculated?: number;
  dcPercentCutCalculated?: number;
  tcPercentCutCalculated?: number;
  displayType?: string;
}
