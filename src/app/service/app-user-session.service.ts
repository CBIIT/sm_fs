import { Injectable } from '@angular/core';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { CancerActivityControllerService, NciPerson } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class AppUserSessionService {

  private loggedOnUser: NciPerson;
  private environment: string;
  private userCancerActivities;

  private roles: string[];

  constructor(private userService: UserService,
              private caService: CancerActivityControllerService,
              private logger: NGXLogger) {
  }

  initialize(): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      this.userService.getSecurityCredentials().subscribe(
        (result) => {
          // this.logger.debug('UserService.getSecurityCrentials: ', result);
          this.loggedOnUser = result.nciPerson;
          this.environment = result.environment;
          this.roles = [];
          result.authorities.forEach(authority => {
            this.roles.push(authority.authority);
          });
          this.caService.getCasForPdUsingGET(this.loggedOnUser.npnId, true).subscribe(
            (caresult) => {
              // this.logger.debug('User assigned cancer activities: ', caresult);
              this.userCancerActivities = caresult;
              resolve();
            },
            (caerror) => {
              this.logger.error('Failed to get User CAs for error', caerror);
              reject();
            }
          );
        },
        (error) => {
          this.logger.error('Failed to userService.getSecurityCrentials for error', error);
          reject();
        }
      );
    });
  }

  isPD(): boolean {
    // to-do: need to check roles to determine if PD
    return this.roles.indexOf('PD') > -1;
  }

  isPA(): boolean {
    // to-do: need to check roles to determine if PD
    return this.roles.indexOf('PA') > -1;
  }

  isProgramStaff(): boolean {
    return this.isPD() || this.isPA();
  }

  isOefiaFundsCertifier(): boolean {
    return this.roles.indexOf('FCNCI') > -1 || this.roles.indexOf('PFRNAPR') > -1;
  }

  isSuperUser(): boolean {
    return this.roles.indexOf('PFRNAPR') > -1;
  }

  isOga(): boolean {
    return this.roles.indexOf('GM') > -1;
  }

  isScientificApprover(): boolean {
    return this.roles.indexOf('PD') > -1
      || this.roles.indexOf('DOC') > -1
      || this.roles.indexOf('DD') > -1
      || this.roles.indexOf('SPL') > -1;
  }

  getEnvironment(): string {
    return this.environment;
  }

  getUserCancerActivities(): any[] {
    return this.userCancerActivities;
  }

  getUserCaAsString(): string {
    const cas = this.getUserCaCodes();
    if (cas) {
      return cas.join(', ');
    } else {
      return null;
    }
  }

  getUserCaCodes(): string[] {
    if (this.userCancerActivities && this.userCancerActivities.length > 0) {
      const cas = this.userCancerActivities.map(item => {
        return item.code;
      });
      return cas;
    }
    return null;
  }

  getLoggedOnUser(): NciPerson {
    return this.loggedOnUser;
  }

  hasRole(role: string): boolean {
    return this.roles.indexOf(role) > -1;
  }

}
