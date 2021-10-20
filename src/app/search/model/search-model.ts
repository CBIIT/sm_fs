import {Injectable} from "@angular/core";
import {SearchCriteria} from "../search-criteria";
import {getCurrentFiscalYear} from "../../utils/utils";
import {NGXLogger} from "ngx-logger";

@Injectable({
  providedIn: 'root'
})
export class SearchModel {

  searchCriteriaFR: SearchCriteria = {};
  searchCriteriaFP: SearchCriteria = {};
  searchCriteriaGrants: SearchCriteria = {};

  searchType: string;


  constructor(private logger: NGXLogger) {
    this.reset();
  }

  reset(type?: string): void {
    const currFY: number = getCurrentFiscalYear();
    if (type) {
      switch(type) {
        case 'FR':
          this.searchCriteriaFR = { fyRange: { fromFy: currFY, toFy: currFY }, searchType: 'FR'};
          break;
        case 'FP':
          this.searchCriteriaFP = { fyRange: { fromFy: currFY, toFy: currFY }, searchType: 'FP'};
          break;
        case 'G':
          this.searchCriteriaGrants = { fyRange: { fromFy: currFY, toFy: currFY }, searchType: 'G'};
          break;
      }
    }
    else {
      this.searchCriteriaFR = { fyRange: { fromFy: currFY, toFy: currFY }, searchType: 'FR'};
      this.searchCriteriaFP = { fyRange: { fromFy: currFY, toFy: currFY }, searchType: 'FP'};
      this.searchCriteriaGrants = { fyRange: { fromFy: currFY, toFy: currFY }, searchType: 'G'};
    }
  }

  getSearchCriteria(type?: string): SearchCriteria {
    switch (type) {
      case 'FP':
        return this.searchCriteriaFP;
      case 'G':
        return this.searchCriteriaGrants;
      default:
        return this.searchCriteriaFR;
    }
  }

  setSearchCriteria(type: string, criteria: SearchCriteria) {
    switch (type) {
      case 'FR':
        this.searchCriteriaFR = criteria;
        break;
      case 'FP':
        this.searchCriteriaFP = criteria;
        break;
      case 'G':
        this.searchCriteriaGrants = criteria;
        break;
      default:
        this.logger.error('Wrong Type of Search Criteria', type, criteria);
    }
  }
}
