export interface SearchCriteria {
  searchType?: string;
  id?: string;
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
  fundingPlanStatus?: string[];
  fundingSources?: string;
  institutionName?: string;
  ncabRange?: { fromNcab: string, toNcab: string };
  doc?: string;
  requestingDoc?: string;
  requestingPd?: string;
  piName?: string;
  pdName?: string;
  i2status?: string;
}
