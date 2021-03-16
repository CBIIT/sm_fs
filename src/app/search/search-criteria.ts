export interface SearchCriteria {
    requestOrPlan: 'Request'|'Plan'; 
    searchPool: string; 
    requestType: string; 
    rfaPa:string; 
    fyRange:{fromFy:number,toFy:number}, 
    grantNumber:string
}
