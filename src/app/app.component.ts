import { Component, OnInit } from '@angular/core';
import { AppPropertiesService } from './service/app-properties.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'fs';
  constructor(private appPropertiesService:AppPropertiesService) {}

  async ngOnInit() {
    // console.log("AppComponent ngOnInit");
    // await this.appPropertiesService.initialize2();
    // console.log("AppComponent ngOnInit Ends");
  }

  receiveCasValue(event: any) {
    console.log("receive CAS value:"+event);
  }

  receivePdIdValue(event: any) {
    console.log("receive PD Id value:"+event);
  }
}
