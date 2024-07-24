import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Injectable({
  providedIn: 'root'
})
export class PdAuthGuard  {

  constructor(
    private router: Router,
    private userSessionService: AppUserSessionService
  ) { }

  canActivate(): boolean {
    const allowedRoles: string[] = ['PD', 'PA'];
    if (!this.userSessionService.isProgramStaff()) {
      this.router.navigate(['/unauthorize']);
      return false;
    }
    return true;
  }
}
