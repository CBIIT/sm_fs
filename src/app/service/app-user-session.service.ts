import { Injectable } from '@angular/core';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { CancerActivityControllerService, NciPerson } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AppUserSessionService {

  private loggedOnUser: NciPerson;
  private environment: string;
  private userCancerActivities;

  private roles: string[];

  constructor(private userService: UserService,
              private caService: CancerActivityControllerService) {
  }

  async initialize(): Promise<any> {
    console.log('AppUserSessionService initialize starts');
    const result = await this.userService.getSecurityCredentials().toPromise();
    console.log('UserService.getSecurityCrentials returns ', result);
    this.loggedOnUser = result.nciPerson;
    this.environment = result.environment;
//        console.log("nci_person", result.nciPerson);
//          this.canChangeUser = this.userService.isTechSupportAuth(result.authorities);
    this.roles = [];
    result.authorities.forEach(authority => {
            this.roles.push(authority.authority); } );
    const result2 = await this.caService.getCasForPdUsingGET(this.loggedOnUser.npnId, true).toPromise();
    console.log('user assigned cancer activities:', result2);
    this.userCancerActivities = result2;
    console.log('AppUserSessionService Returns');
  }

  isPD(): boolean{
    // to-do: need to check roles to determine if PD
    return this.roles.indexOf('PD') > -1;
  }

  isPA(): boolean{
    // to-do: need to check roles to determine if PD
    return this.roles.indexOf('PA') > -1;
  }

  isProgramStuff(): boolean {
    return this.isPD() || this.isPA();
  }

  getEnvironment(): string{
    return this.environment;
  }

  getUserCancerActivities(): any[] {
    return this.userCancerActivities;
  }

  getUserCaAsString(): string {
    const cas = this.getUserCaCodes();
    if (cas) {
      return cas.join(', ');
    }
    else {
      return null;
    }
  }

  getUserCaCodes(): string[] {
    if (this.userCancerActivities && this.userCancerActivities.length > 0 ) {
      const cas = this.userCancerActivities.map(item => {
        return item.code;
      });
      return cas;
    }
    return null;
  }

  getLoggedOnUser(): NciPerson{
    return this.loggedOnUser;
  }

  hasRole(role: string): boolean {
    return this.roles.indexOf(role) > -1;
  }

}
