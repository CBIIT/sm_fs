import { Injectable } from '@angular/core';
import { GrantsSearchCriteriaDto } from '@cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { getCurrentFiscalYear } from 'src/app/utils/utils';

@Injectable()
export class GrantsSearchFilterService {
    grantsSearchCriteria: GrantsSearchCriteriaDto;
    searchWithin: string;
    selectedCas: string[] | string;
    selectedPd: number;
    searched: boolean;
    currentFy: number;
    defaultSearchWithin: string;

    constructor(private userSessionService: AppUserSessionService) {
        this.grantsSearchCriteria =
        {grantType: '', grantMech: '', grantIc: '', grantSerial: '', grantYear: '', grantSuffix: ''};
        this.currentFy = getCurrentFiscalYear();
        this.grantsSearchCriteria.fromFy = this.currentFy - 1;
        this.grantsSearchCriteria.toFy = this.currentFy;
        if (this.userSessionService.isPD()) {
            this.defaultSearchWithin = 'mypf';
        }
        else if (this.userSessionService.isPA()) {
            this.defaultSearchWithin = 'myca';
        }

        this.searchWithin = this.defaultSearchWithin;
        this.selectedCas = [];
    }

    getGrantsSearchCriteria(): GrantsSearchCriteriaDto {
        return this.grantsSearchCriteria;
    }

  }
