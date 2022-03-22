import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { AppPropertiesService } from '../service/app-properties.service';

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
