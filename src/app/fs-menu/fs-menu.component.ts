import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from '../service/app-properties.service';

@Component({
  selector: 'app-fs-menu',
  templateUrl: './fs-menu.component.html',
  styleUrls: ['./fs-menu.component.css']
})
export class FsMenuComponent implements OnInit {

  paylistDashboardUrl;
  paylistPendingGrantsUrl;
  paylistSearchUrl;


  constructor(private appPropertiesService:AppPropertiesService) { }

  ngOnInit(): void {
    this.paylistDashboardUrl=this.appPropertiesService.getProperty('paylistUrl')+'#side-nav-paylists';
    this.paylistPendingGrantsUrl=this.appPropertiesService.getProperty('paylistUrl')+'#side-nav-grants';
    this.paylistSearchUrl=this.appPropertiesService.getProperty('paylistUrl')+'#side-nav-find-paylists';
  }

}
