import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '@cbiit/i2ecui-lib';
import { SecurityCredentials, GrantedAuthority } from '@cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { CustomServerLoggingService } from '../logging/custom-server-logging-service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private userService: UserService,
    private requestModel: RequestModel,
    private logger: CustomServerLoggingService
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
