import { Injectable } from '@angular/core';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { NciPerson } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AppUserSessionService {

  private loggedOnUser:NciPerson;
  private roles:string[];

  constructor(private userService:UserService) {
  }

  async initialize() {
    console.log("AppUserSessionService initialize starts");
    this.userService.getSecurityCredentials().subscribe(
      result => {
        console.log(result);
        this.loggedOnUser = result.nciPerson;
//          this.canChangeUser = this.userService.isTechSupportAuth(result.authorities);
        this.roles = [];
        result.authorities.forEach(authority => {
            this.roles.push(authority.authority)});
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


}
