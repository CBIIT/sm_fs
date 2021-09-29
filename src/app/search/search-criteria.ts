export interface SearchCriteria {
  searchType?: string;
  rfaPa?: string;
  fundingRequestStatus?: string[],
  frTypes?: string[],
  // fundingRequestType?: string,
  fyRange?: { fromFy: number, toFy: number };
  grantNumber?: {
    grantNumberType: string,
    grantNumberIC: string,
    grantNumberMech: string,
    grantNumberSerial: string,
    grantNumberSuffix: string,
    grantNumberYear: string
  }
}
