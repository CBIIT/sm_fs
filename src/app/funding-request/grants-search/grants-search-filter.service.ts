import { GrantsSearchCriteriaDto } from '@nci-cbiit/i2ecws-lib';
import { getCurrentFiscalYear } from 'src/app/utils/utils';

export class GrantsSearchFilterService {

    grantsSearchCriteria: GrantsSearchCriteriaDto;

    searchWithin = 'mypf';

    selectedPd: number;

    searched: boolean;

    constructor() {
        this.grantsSearchCriteria =
        {grantType: '', grantMech: '', grantIc: '', grantSerial: '', grantYear: '', grantSuffix: ''};
        const curFy = getCurrentFiscalYear();
        this.grantsSearchCriteria.fromFy = curFy - 1;
        this.grantsSearchCriteria.toFy = curFy;
    }

    getGrantsSearchCriteria(): GrantsSearchCriteriaDto {
        return this.grantsSearchCriteria;
    }

  }
