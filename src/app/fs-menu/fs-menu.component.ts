import { Component, OnInit } from '@angular/core';
import { AppUserSessionService } from '../service/app-user-session.service';
import { PaylistControllerService } from '@cbiit/i2efsws-lib';
import { roleNames } from '../service/role-names';
import { NGXLogger } from "ngx-logger";

@Component({
  selector: 'app-fs-menu',
  templateUrl: './fs-menu.component.html',
  styleUrls: ['./fs-menu.component.css']
})
export class FsMenuComponent implements OnInit {

  paylistDashboardUrl: string;
  paylistPendingGrantsUrl: string;
  paylistSearchUrl: string;

  oefiaCertifier: boolean;
  splCertifier: boolean;
  pd: boolean;
  pa: boolean;
  paylistReadOnlyRole = false;
  gmLeadership: boolean;
  paylistUrl: string;
  pendingGrantsCount: number;

  constructor(
    private userSessionService: AppUserSessionService,
    private paylistControllerService: PaylistControllerService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    // this.paylistUrl = this.gwbLinksService.getProperty('Paylist');
    this.paylistUrl = '/paylist/';
    this.paylistDashboardUrl = this.paylistUrl + '#side-nav-paylists';
    this.paylistPendingGrantsUrl = this.paylistUrl + '#side-nav-grants';
    this.paylistSearchUrl = this.paylistUrl + '#side-nav-find-paylists';

    this.oefiaCertifier = this.userSessionService.hasRole(roleNames.OEFIA_CERTIFIER);
    this.splCertifier = this.userSessionService.hasRole(roleNames.SPL_CERTIFIER);
    this.paylistReadOnlyRole = this.userSessionService.hasRole(roleNames.PAYLIST_READ_ONLY);
    this.gmLeadership = this.userSessionService.hasRole(roleNames.GM_LEADERSHIP);
    this.pd = this.userSessionService.isPD();
    this.pa = this.userSessionService.isPA();

    this.paylistControllerService.getPaylistPendingGrantsCount().subscribe(
      (result) => {
        this.pendingGrantsCount = result;
      },
      (error) => {
        this.logger.error('retrieveFundingRequest failed ', error);
      }
    );
  }
}
