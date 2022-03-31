import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '@cbiit/i2ecui-lib';
import { GrantedAuthority, SecurityCredentials } from '@cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { HeartbeatService } from '@cbiit/i2ecui-lib';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private userService: UserService,
    private requestModel: RequestModel,
    private logger: NGXLogger,
    private heartbeatService: HeartbeatService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      return new Promise((resolve) => {
        this.userService.getSecurityCredentials().toPromise()
          .then((creds: SecurityCredentials) => {

            if (creds) {
              if (this.hasValidAuthority(creds.authorities)) {
                this.logger.info(`New session started for user ${creds.username}`);
                this.requestModel?.reset();
                this.requestModel?.programRecommendedCostsModel?.deepReset(false);
                this.heartbeatService.continue();
                resolve(true);
              } else {
                this.logger.warn(`User ${creds.username} is not authorized to access Funding Selections`);
                this.router.navigate(['/unauthorize']);
                resolve(false);
              }

            }
          })
          .catch(err => {
            this.router.navigate(['/unauthorize']);
            resolve(false);
          });
      });
  }

  hasValidAuthority(authorities: GrantedAuthority[]): boolean {
    for (const a in authorities) {
      if (authorities[a].authority === 'I2E_USER') {
        return true;
      }
    }
    return false;
  }

}
