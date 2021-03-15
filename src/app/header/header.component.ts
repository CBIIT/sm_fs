import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { NciPerson } from 'i2ecws-lib';
import { UserService } from 'i2ecui-lib';
import { environment } from '../../environments/environment';
import { AppPropertiesService } from '../service/app-properties.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {

  loggedOnUser: NciPerson;
  nciHome: string;
  workBenchUrl: string;
  nearUrl: string ;
  canChangeUser: boolean ;

  constructor(private userService: UserService, 
              private AppPropertiesService: AppPropertiesService) { }

  async ngOnInit() {
      this.userService.getSecurityCredentials().subscribe(
      result => {
        if (result ) {
          this.loggedOnUser = result.nciPerson;
          this.canChangeUser = this.userService.isTechSupportAuth(result.authorities);
        }
      });

     // await this.AppPropertiesService.initialize2();
      console.log("before workbench");
      this.workBenchUrl= this.AppPropertiesService.getProperty('workBenchUrl');
      console.log("before nciHome");
      this.nciHome = this.AppPropertiesService.getProperty('nciHome');
      console.log("before nearUrl");
      this.nearUrl = this.AppPropertiesService.getProperty('nearUrl');
    
  }
    // this.nciHome = environment.nciHome;
    // this.workBenchUrl = environment.workBenchUrl;
    // this.nearUrl = environment.nearUrl;
}
