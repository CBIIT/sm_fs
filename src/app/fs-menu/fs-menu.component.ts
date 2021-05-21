import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from '../service/app-properties.service';
import { AppUserSessionService } from '../service/app-user-session.service';

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

  constructor(private appPropertiesService: AppPropertiesService,
              private userSessionService: AppUserSessionService) { }

  ngOnInit(): void {
    console.log('inside fs menu ngOnInit()');
    this.paylistDashboardUrl = this.appPropertiesService.getProperty('paylistUrl') + '#side-nav-paylists';
    this.paylistPendingGrantsUrl = this.appPropertiesService.getProperty('paylistUrl') + '#side-nav-grants';
    this.paylistSearchUrl = this.appPropertiesService.getProperty('paylistUrl') + '#side-nav-find-paylists';


    this.ogaCertifier = this.userSessionService.hasRole('GMBRCHF');
    this.oefiaCertifier = this.userSessionService.hasRole('OEFIACRT');
    this.splCertifier = this.userSessionService.hasRole('DES');
    this.pd = this.userSessionService.isPD();
    this.pa = this.userSessionService.isPA();
  }

}
