import { Injectable } from '@angular/core';
import { GrantsSearchCriteriaDto } from '@nci-cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { getCurrentFiscalYear } from 'src/app/utils/utils';

@Injectable()
export class GrantsSearchFilterService {

    grantsSearchCriteria: GrantsSearchCriteriaDto;

    searchWithin: string;

    selectedPd: number;

    searched: boolean;

    constructor(private userSessionService: AppUserSessionService) {
        this.grantsSearchCriteria =
        {grantType: '', grantMech: '', grantIc: '', grantSerial: '', grantYear: '', grantSuffix: ''};
        const curFy = getCurrentFiscalYear();
        this.grantsSearchCriteria.fromFy = curFy - 1;
        this.grantsSearchCriteria.toFy = curFy;
        if (this.userSessionService.isPD()) {
            this.searchWithin = 'mypf';
        }
        else if (this.userSessionService.isPA()) {
            this.searchWithin = 'myca';
        }

    }

    getGrantsSearchCriteria(): GrantsSearchCriteriaDto {
        return this.grantsSearchCriteria;
    }

  }
