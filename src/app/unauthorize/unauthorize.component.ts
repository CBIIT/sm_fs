import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';

@Component({
  selector: 'app-unauthorize',
  templateUrl: './unauthorize.component.html',
  styleUrls: ['./unauthorize.component.css']
})
export class UnauthorizeComponent implements OnInit {

  techSupport: string;

  constructor(private appPropertiesService: AppPropertiesService) { }

  ngOnInit(): void {
    this.techSupport = this.appPropertiesService.getProperty('TECH_SUPPORT_EMAIL');
  }

}
