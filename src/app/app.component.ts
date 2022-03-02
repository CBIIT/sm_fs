import {Component, Inject, isDevMode} from '@angular/core';
import {Router} from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(public router: Router,
              private logger: NGXLogger) {
    this.logger.debug('production flag in environment?: ' + environment.production);
    this.logger.debug('is DevMode?: ' + isDevMode());
  }

  title = 'Funding Selections';
}
