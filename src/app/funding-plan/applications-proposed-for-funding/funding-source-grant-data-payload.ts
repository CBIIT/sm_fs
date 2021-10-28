/**
 * TODO: incorporate into ApplicationsProposedForFunding component
 *
 */
export class FundingSourceGrantDataPayload {
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

  constructor() {
  }
}
