import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '@nci-cbiit/i2ecui-lib';
import { SecurityCredentials, GrantedAuthority } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private userService: UserService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      return new Promise((resolve) => {
        this.userService.getSecurityCredentials().toPromise()
          .then((creds: SecurityCredentials) => {

            if (creds) {
              if (this.hasValidAuthority(creds.authorities)) {
                resolve(true);
              } else {
                this.router.navigate(['/unauthorize']);
                resolve(false);
              }

            }
          })
          .catch(err => {
            this.router.navigate(['/unauthorize']);
            resolve(false);
          });
      })
  }

  hasValidAuthority(authorities: GrantedAuthority[]): boolean {
    for (let a in authorities) {
      if (authorities[a].authority == "I2E_USER") {
        return true;
      }
    }
    return false;
  }

}
