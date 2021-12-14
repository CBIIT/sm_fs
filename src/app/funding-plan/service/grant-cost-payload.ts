export interface GrantCostPayload {
  applId: number;
  fseId: number;
  octId?: number;
  oefiaTypeId?: number;
  fundingSourceName: string;
  approvedDirect: number;
  approvedTotal: number;
  requestedDirect: number;
  requestedTotal: number;
  directPercentCut: number;
  totalPercentCut: number;
  selectedCAN?: number;
  activityCodes: string;
  bmmCodes: string;
  frtId: number;
  nciSourceFlag?: string;
}


export function getOrderFunction(sourceOrder: number[]): (a: GrantCostPayload, b: GrantCostPayload) => number {

  return ((a: GrantCostPayload, b: GrantCostPayload) => {
    if (+a.applId === +b.applId) {
      return sourceOrder.indexOf(+a.fseId) - sourceOrder.indexOf(+b.fseId);
    } else {
      return +a.applId - +b.applId;
    }
  });
}
