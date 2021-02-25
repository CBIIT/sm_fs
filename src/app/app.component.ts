import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'fs';

  receiveCasValue(event: any) {
    console.log("receive CAS value:"+event);
  }

  receivePdIdValue(event: any) {
    console.log("receive PD Id value:"+event);
  }
}
