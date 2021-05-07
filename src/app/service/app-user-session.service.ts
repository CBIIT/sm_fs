import { Injectable } from '@angular/core';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { CancerActivityControllerService, NciPerson } from '@nci-cbiit/i2ecws-lib'

@Injectable({
  providedIn: 'root'
})
export class AppUserSessionService {

  private loggedOnUser:NciPerson;
  private environment:string;
  private userCancerActivities:any[];

  private roles:string[];

  constructor(private userService:UserService,
              private caService:CancerActivityControllerService) {
  }

  async initialize() {
    console.log("AppUserSessionService initialize starts");
    this.userService.getSecurityCredentials().subscribe(
      result => {
        console.log(result);
        this.loggedOnUser = result.nciPerson;
        this.environment=result.environment;
//        console.log("nci_person", result.nciPerson);
//          this.canChangeUser = this.userService.isTechSupportAuth(result.authorities);
        this.roles = [];
        result.authorities.forEach(authority => {
            this.roles.push(authority.authority)});
        this.caService.getCasForPdUsingGET(this.loggedOnUser.npnId).subscribe(
          result2=>{
            console.log("user assigned cancer activities:",result2);
            this.userCancerActivities=result2;
          },
          error2=>{
            console.log("error get user cancer activities, ",error2);
          }    
        );    
        console.log("AppUserSessionService initialize done");
      },
      error =>{
        console.log("AppUserSessionService initialze error ", error);
      });
  }

  isPD():boolean{
    //to-do: need to check roles to determine if PD
    return true;
  }

  getEnvironment():string{
    return this.environment;
  }

  getUserCancerActivities():any[] {
    return this.userCancerActivities;
  }

  getUserCaAsString():string {
    let cas=this.getUserCaCodes();
    if (cas)
      return cas.join(', ');
    else
      return null;
  }

  getUserCaCodes():string[] {
    if (this.userCancerActivities && this.userCancerActivities.length>0) {
      var cas=this.userCancerActivities.map(item=>{
        return item['code'];
      });
      return cas;
    }
    return null;
  }

  getLoggedOnUser():NciPerson{
    return this.loggedOnUser;
  }


}
