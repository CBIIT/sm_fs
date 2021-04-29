import { GrantsSearchCriteriaDto } from "@nci-cbiit/i2ecws-lib";

export class GrantsSearchFilterService {

    setRfaPa(event: any) {
      //TO-DO need to add Rfq PA to searchCriteria
    }

    setCayCodes(event: any) {
      this.grantsSearchCriteria.cayCodes=event;
    }
    setPdId(event: string) {
        console.log('selected pd is ', event);
//      TO-DO: need to add pd id to searchcriteria
    }

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
  }