import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { SecurityCredentials, GrantedAuthority } from '@nci-cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Injectable({
  providedIn: 'root'
})
export class PdAuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private userService: UserService,
    private userSessionService: AppUserSessionService
  ) { }

  canActivate(): boolean {
    if (!this.userSessionService.isPD()) {
      this.router.navigate(['/unauthorize']);
      return false;
    }
    return true;
  }
}
