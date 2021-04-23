import {SearchCriteria} from './search-criteria';

export class SearchFilterService {

  public searchFilter: SearchCriteria =
    {
      requestOrPlan: 'Request',
      searchPool: '',
      requestType: '',
      rfaPa: '',
      fyRange: {fromFy: undefined, toFy: undefined},
      grantNumber: '',
      npnId: undefined
    };


}
