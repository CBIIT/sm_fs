import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { HeartbeatService } from '@cbiit/i2ecui-lib';
import { v4 as uuidv4 } from 'uuid';
import { AppUserSessionService } from '../service/app-user-session.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard  {

  constructor(
    private router: Router,
    private userSessionService: AppUserSessionService,
    private requestModel: RequestModel,
    private logger: NGXLogger,
    private heartbeatService: HeartbeatService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      if (this.userSessionService.hasRole('I2E_USER')) {
        this.logger.info(`Session active for user ${this.userSessionService.getLoggedOnUser()?.nihNetworkId}`);
        this.requestModel?.reset();
        this.requestModel?.programRecommendedCostsModel?.deepReset(false);
        this.heartbeatService.continue();
        sessionStorage.setItem('UUID', uuidv4());
        sessionStorage.setItem('SESSIONID', this.heartbeatService.sessionId);
        return true;
      } else {
        this.logger.warn('User is not authorized to access Funding Selections');
        this.router.navigate(['/unauthorize']);
        return false;
      }
  }

}
