import { Component, OnInit } from '@angular/core';
import { AppUserSessionService } from '../service/app-user-session.service';
import { PaylistControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fs-menu',
  templateUrl: './fs-menu.component.html',
  styleUrls: ['./fs-menu.component.css']
})
export class FsMenuComponent implements OnInit {

  paylistDashboardUrl: string;
  paylistPendingGrantsUrl: string;
  paylistSearchUrl: string;

  ogaCertifier: boolean;
  oefiaCertifier: boolean;
  splCertifier: boolean;
  pd: boolean;
  pa: boolean;
  paylistReadOnlyRole: boolean =false;
  paylistUrl: string;
  pendingGrantsCount : number;

  constructor(
              private userSessionService: AppUserSessionService,
              private paylistControllerService: PaylistControllerService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    // this.paylistUrl = this.gwbLinksService.getProperty('Paylist');
    this.paylistUrl = "/paylist/";
    this.paylistDashboardUrl = this.paylistUrl+ '#side-nav-paylists';
    this.paylistPendingGrantsUrl = this.paylistUrl + '#side-nav-grants';
    this.paylistSearchUrl =this.paylistUrl + '#side-nav-find-paylists';

    this.ogaCertifier = this.userSessionService.hasRole(roleNames.OGA_CERTIFIER);
    this.oefiaCertifier = this.userSessionService.hasRole(roleNames.OEFIA_CERTIFIER);
    this.splCertifier = this.userSessionService.hasRole(roleNames.SPL_CERTIFIER);
    this.paylistReadOnlyRole = this.userSessionService.hasRole(roleNames.PAYLIST_READ_ONLY);
    this.pd = this.userSessionService.isPD();
    this.pa = this.userSessionService.isPA();

    this.paylistControllerService.getPaylistPendingGrantsCountUsingGET().subscribe(
      (result) => {
        this.pendingGrantsCount = result;

      },
      (error) => {
        this.logger.error('retrieveFundingRequest failed ', error);
      }
    );

  }

}

export enum roleNames {
  OGA_CERTIFIER= "GMBRCHF",
  OEFIA_CERTIFIER = "OEFIACRT",
  SPL_CERTIFIER = "DES",
  PAYLIST_READ_ONLY= "PAYLSTVW"
}
