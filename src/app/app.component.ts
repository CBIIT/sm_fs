import {Component, Inject, isDevMode} from '@angular/core';
import {Router} from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(public router: Router) {
    console.log('production flag in environment?: ' + environment.production);
    console.log('is DevMode?: ' + isDevMode());
  }

  title = 'Funding Selections';
}
