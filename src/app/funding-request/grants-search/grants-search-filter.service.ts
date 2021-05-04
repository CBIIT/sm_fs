import { GrantsSearchCriteriaDto } from "@nci-cbiit/i2ecws-lib";

export class GrantsSearchFilterService {

    grantsSearchCriteria: GrantsSearchCriteriaDto={"fromFy": 2020, 
    "toFy":2020,
    "cayCodes":["ED"]};

    getGrantsSearchCriteria():GrantsSearchCriteriaDto {
        return this.grantsSearchCriteria;
    }
  }