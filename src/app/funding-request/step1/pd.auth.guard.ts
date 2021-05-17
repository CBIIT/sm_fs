import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Injectable({
  providedIn: 'root'
})
export class PdAuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private userSessionService: AppUserSessionService
  ) { }

  canActivate(): boolean {
    const allowedRoles: string[] = ['PD', 'PA'];
    if (!this.userSessionService.isPD()) {
      this.router.navigate(['/unauthorize']);
      return false;
    }
    return true;
  }
}
