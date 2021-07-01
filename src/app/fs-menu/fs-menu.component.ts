import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from '../service/app-properties.service';
import { AppUserSessionService } from '../service/app-user-session.service';
import { GwbLinksService } from '@nci-cbiit/i2ecui-lib';
import { PaylistControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fs-menu',
  templateUrl: './fs-menu.component.html',
  styleUrls: ['./fs-menu.component.css']
})
export class FsMenuComponent implements OnInit {

  paylistDashboardUrl;
  paylistPendingGrantsUrl;
  paylistSearchUrl;

  ogaCertifier: boolean;
  oefiaCertifier: boolean;
  splCertifier: boolean;
  pd: boolean;
  pa: boolean;
  paylistReadOnlyRole: boolean =false;
  paylistUrl: string; 
  pendingGrantsCount;

  constructor(
              private userSessionService: AppUserSessionService,
              private gwbLinksService: GwbLinksService,
              private paylistControllerService: PaylistControllerService,
              private logger: NGXLogger) { }

  ngOnInit(): void {  
    this.paylistUrl = this.gwbLinksService.getProperty('Paylist');
    this.paylistDashboardUrl = this.paylistUrl+ '#side-nav-paylists';
    this.paylistPendingGrantsUrl = this.paylistUrl + '#side-nav-grants';
    this.paylistSearchUrl =this.paylistUrl + '#side-nav-find-paylists';

    this.ogaCertifier = this.userSessionService.hasRole('GMBRCHF');
    this.oefiaCertifier = this.userSessionService.hasRole('OEFIACRT');
    this.splCertifier = this.userSessionService.hasRole('DES');
    this.paylistReadOnlyRole = this.userSessionService.hasRole('PAYLSTVW');
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
