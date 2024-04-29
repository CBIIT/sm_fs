import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { AppUserSessionService } from '../service/app-user-session.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})

export class HeaderComponent implements OnInit {

  public headerTemplateData = {
    appName: 'Funding Selections',
    docs: [
      { docName: 'Individual Request Guide', docLink: this.propertiesService.getProperty('I2EWEB_URL') + 'documentation/application/FSIndividualRequestUsersGuide.pdf' },
      { docName: 'Funding Plan Guide', docLink: this.propertiesService.getProperty('I2EWEB_URL') + 'documentation/application/FSFundingPlanUsersGuide.pdf' },
      { docName: 'Video Tutorials', docLink: this.propertiesService.getProperty('I2EWEB_URL') + '/i2e-video.html' },
      { docName: 'Release Notes', docLink: this.propertiesService.getProperty('I2EWEB_URL') + '/releaseNotes/fundingselections.html' }],
    helpGuides: [{ helpGuideName: 'Email Technical Support', helpGuideLink: 'mailto:' + this.propertiesService.getProperty('TECH_SUPPORT_EMAIL') + '?subject=Funding Selections' },
    { helpGuideName: 'Email Business Policy Questions', helpGuideLink: 'mailto:' + this.propertiesService.getProperty('BUS_POLICY_EMAIL') + '?subject=Funding Selections' }],
  };

  constructor(private propertiesService: AppPropertiesService,
    private userSessionService: AppUserSessionService) {

    if (userSessionService.isGmLeadershipUser()) {
      this.headerTemplateData.docs.splice(2, 0, { docName: 'GM Leadership User Guide', docLink: this.propertiesService.getProperty('I2EWEB_URL') + 'documentation/application/FSPaylistsUsersGuide.pdf' });
    }
    else if (userSessionService.isOefiaAndSplUser()) {
      this.headerTemplateData.docs.splice(2, 0, { docName: 'OEFIA and SPL Certifiers Guide', docLink: this.propertiesService.getProperty('I2EWEB_URL') + 'documentation/application/FSPaylinesUsersGuide.pdf' });
    }
  }

  ngOnInit(): void { }
}
