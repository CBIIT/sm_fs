export interface SearchCriteria {
  searchType?: string;
  rfaPa?: string;
  fundingRequestStatus?: string[],
  frTypes?: string[];
  fyRange?: { fromFy: number, toFy: number };
  grantNumber?: {
    grantNumberType: string,
    grantNumberIC: string,
    grantNumberMech: string,
    grantNumberSerial: string,
    grantNumberSuffix: string,
    grantNumberYear: string
  };
  fundingPlanStatus?: string; //TODO - switch to array
  fundingSources?: string;
  institutionName?: string;
  ncabRange?: { fromNcab: string, toNcab: string };
  requestingDoc?: string;
  piName?: string;
  pdName?: string;
}
