import { GrantsSearchCriteriaDto } from "@nci-cbiit/i2ecws-lib";
import { getCurrentFiscalYear } from "src/app/utils/utils";

export class GrantsSearchFilterService {

    grantsSearchCriteria: GrantsSearchCriteriaDto
    ={grantType:'',grantMech:'',grantIc:'',grantSerial:'',grantYear:'',grantSuffix:''};

    searchWithin:string='mypf';

    selectedPd:number;

    searched:boolean;

    constructor() {
        let curFy=getCurrentFiscalYear();
        this.grantsSearchCriteria.fromFy=curFy-1;
        this.grantsSearchCriteria.toFy=curFy;
    }

    getGrantsSearchCriteria():GrantsSearchCriteriaDto {
        return this.grantsSearchCriteria;
    }

  }