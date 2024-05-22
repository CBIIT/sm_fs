import { Injectable } from '@angular/core';
import { UserService } from '@cbiit/i2ecui-lib';
import { CancerActivitiesDto, CancerActivityControllerService } from '@cbiit/i2erefws-lib';
import { NciPerson, UserControllerService } from "@cbiit/i2ecommonws-lib";
import { NGXLogger } from 'ngx-logger';
import { roleNames } from '../service/role-names';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AppUserSessionService {

  private loggedOnUser: NciPerson;
  private environment: string;
  private userCancerActivities: CancerActivitiesDto[];
  public isMbOnly = false;

  private roles: string[] = [];
  private primaryGmLeadership = false;

  constructor(private userService: UserService,
              private caService: CancerActivityControllerService,
              private userControllerService: UserControllerService,
              private router: Router,
              private logger: NGXLogger) {
  }

  initialize(): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      this.userService.getSecurityCredentials().subscribe(
        (result) => {
          if(!result.username) {
            reject(`Authentication failed`);
          } else {
            this.logger.debug(result);
            this.loggedOnUser = result.nciPerson;
            this.environment = result.environment;
            this.roles = [];
            result.authorities?.forEach(authority => {
              this.roles.push(authority.authority);
              if (authority.authority === 'GMLEADER') {
                this.userControllerService.isUserRolePrimary(this.loggedOnUser.npnId, authority.authority).subscribe(
                  isPrimary => {
                    this.primaryGmLeadership = isPrimary;
                  }
                )
              }
            });
            this.caService.getCasForPd(this.loggedOnUser.npnId, true).subscribe(
              (caresult) => {
                this.userCancerActivities = caresult;
                this.isMbOnly = (caresult && caresult.length === 1 && caresult[0].code === 'MB');
                this.logger.debug('UserSessionService Initialization Done ', this);
                resolve();
              },
              (caerror) => {
                this.logger.error('Failed to get User CAs for error', caerror);
                reject();
              }
            );
          }
        },
        (error) => {
          this.logger.error('Failed to get user credentials', error);
          reject(error);
        }
      );
    });
  }

  isPD(): boolean {
    return this.roles.indexOf('PD') > -1;
  }

  isOefiaAndSplUser(): boolean {
    return this.roles.includes(roleNames.OEFIA_CERTIFIER)
    || this.roles.includes(roleNames.SPL_CERTIFIER);
  }

  isGmLeadershipUser(): boolean {
    return this.roles.includes(roleNames.GM_LEADERSHIP);
  }

  isGMLeaderShipRole():boolean{
    return this.roles.indexOf('GMLEADER') > -1 
  }

  isPrimaryGmLeaderShip(): boolean {
    return this.primaryGmLeadership;
  }

  isPA(): boolean {
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
