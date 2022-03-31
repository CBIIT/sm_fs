import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  constructor( private appPropertiesService: AppPropertiesService) { }
  version : string;
  ngOnInit(): void {
  this.version = this.appPropertiesService.getProperty('appVersion');

  }

}
