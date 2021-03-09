import { Component, OnInit } from '@angular/core';
import { NciPerson } from 'i2ecws-lib';
import { UserService } from 'i2ecui-lib';
import { environment } from '../../environments/environment';


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


  constructor(private userService: UserService) { }

  ngOnInit(): void {

    this.userService.getSecurityCredentials().subscribe(
      result => {
        if (result ) {
          this.loggedOnUser = result.nciPerson;
          this.canChangeUser = this.userService.isTechSupportAuth(result.authorities);
        }
      }
    );

    this.nciHome = environment.nciHome;
    this.workBenchUrl = environment.workBenchUrl;
    this.nearUrl = environment.nearUrl;
  }
}
