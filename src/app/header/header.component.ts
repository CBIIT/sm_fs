import {Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})

export class HeaderComponent implements OnInit {

 
  public headerTemplateData = {
    appName: 'Funding Selections',
    docs: [{docName: 'User Guides', docLink: ''},
      {docName: 'Video Tutorials', docLink: ''},
      {docName: 'Release Notes', docLink: ''}],
    helpGuides: [{helpGuideName: 'Technical Support', helpGuideLink: 'mailto:NCII2ESupport@mail.nih.gov?subject=Funding Selections'}],
  };


  constructor() {
  }

  ngOnInit(): void {
   
     
  }
}
