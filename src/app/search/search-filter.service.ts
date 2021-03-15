export class SearchFilterService {

    public searchFilter: 
    { requestOrPlan: string; searchPool: string; requestType: string; 
      rfaPa:string; fyRange:any, grantNumber:string} 
    = { requestOrPlan: '', 
        searchPool: '', 
        requestType: '', 
        rfaPa:'', 
        fyRange: {},
        grantNumber:''
       };

    init() {
        
    }

}