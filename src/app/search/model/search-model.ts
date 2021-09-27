import {Injectable} from "@angular/core";
import {SearchCriteria} from "../search-criteria";

@Injectable({
  providedIn: 'root'
})
export class SearchModel {

  searchCriteria: SearchCriteria = {};
  searchType: string;


  constructor() {
    this.reset();
  }

  reset(): void {
    this.searchCriteria = {};
    this.searchType = 'FR';
  }
}
