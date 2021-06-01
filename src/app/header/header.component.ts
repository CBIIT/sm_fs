import {Component, OnInit, AfterViewChecked} from '@angular/core';
import {AppNavigationTControllerService, NciPerson} from '@nci-cbiit/i2ecws-lib';
import {UserService} from '@nci-cbiit/i2ecui-lib';
import {environment} from '../../environments/environment';
import {AppPropertiesService} from '../service/app-properties.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})

export class HeaderComponent implements OnInit {

  loggedOnUser: NciPerson;
  nciHome: string;
  workBenchUrl: string;
  canChangeUser: boolean;

  public headerTemplateData = {
    appName: 'Funding Selections',
    docs: [{docName: 'User Guides', docLink: ''},
      {docName: 'Video Tutorials', docLink: ''},
      {docName: 'FAQ', docLink: ''},
      {docName: 'Release Notes', docLink: ''}],
    helpGuides: [{helpGuideName: 'Technical Support', helpGuideLink: 'mailto:NCII2ESupport@mail.nih.gov?subject=Funding Selections'}],
	appNavName: 'FS'
  };

  mainMenus = [];
  otherMenus = [];

  constructor(private userService: UserService,
              private appNavService: AppNavigationTControllerService,
              private appPropertiesService: AppPropertiesService) {
  }

  ngOnInit(): void {
    this.userService.getSecurityCredentials().subscribe(
      result => {
        if (result) {
          // console.log(result);
          this.loggedOnUser = result.nciPerson;
          this.canChangeUser = this.userService.isTechSupportAuth(result.authorities);
          const roles = [];
          result.authorities.forEach(authority => {
            roles.push(authority.authority);
          });
          const linked = [];
          this.appNavService.getNavLinksUsingGET(roles).subscribe(
            result2 => {
              if (result2) {
                result2.forEach(appNav => {
                  if (linked.indexOf(appNav.gwbLinksTDto.displayName) > -1) {
                    return;
                  }
                  linked.push(appNav.gwbLinksTDto.displayName);
                  const nav: { name: string, url: string } = {name: '', url: ''};
                  nav.url = appNav.gwbLinksTDto.composedUrl;
                  nav.name = appNav.gwbLinksTDto.displayName;
                  if (appNav.mainDisplayFlag === 'Y') {
                    this.mainMenus.push(nav);
                  } else {
                    this.otherMenus.push(nav);
                  }

                });
                this.mainMenus.push({name: 'FS', url: '/', target: ''});
                // console.log('main nav menus', this.mainMenus);
                // console.log('other nav menus', this.otherMenus);
              }
            });
        }
      });

    this.workBenchUrl = this.appPropertiesService.getProperty('workBenchUrl');
    this.nciHome = this.appPropertiesService.getProperty('nciHome');

  }
}
