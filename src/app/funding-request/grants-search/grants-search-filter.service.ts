import { GrantsSearchCriteriaDto } from "@nci-cbiit/i2ecws-lib";

export class GrantsSearchFilterService {

    grantsSearchCriteria: GrantsSearchCriteriaDto={"fromFy": 2020, 
    "toFy":2020,
    "cayCodes":["ED"]};

    setFyRange(event) {
        this.grantsSearchCriteria.fromFy=event.fromFy;
        this.grantsSearchCriteria.toFy=event.toFy;
    }

    setI2Status(event: string) {
        this.grantsSearchCriteria.applStatusGroupCode=event;
    }

    getGrantsSearchCriteria():GrantsSearchCriteriaDto {
        return this.grantsSearchCriteria;
    }

    doSearch() {
        
    }
  }