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

  initialize(): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      console.log('AppUserSessionService initialize starts');
      this.userService.getSecurityCredentials().subscribe(
        (result) => {
          console.log('UserService.getSecurityCrentials returns ', result);
          this.loggedOnUser = result.nciPerson;
          this.environment = result.environment;
          this.roles = [];
          result.authorities.forEach(authority => {
                  this.roles.push(authority.authority); } );
          this.caService.getCasForPdUsingGET(this.loggedOnUser.npnId, true).subscribe(
            (caresult) => {
              console.log('user assigned cancer activities:', caresult);
              this.userCancerActivities = caresult;
              console.log('AppUserSessionService Done');
              resolve();
            },
            (caerror) => {
              console.log('Failed to get User CAs for error', caerror);
              reject();
            }
          );
        },
        (error) => {
          console.log('Failed to userService.getSecurityCrentials', error);
          reject();
        }
      );
      });
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
