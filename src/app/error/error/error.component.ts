import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environments/environment';
import { NGXLogger } from 'ngx-logger';
import { AppPropertiesService } from 'src/app/service/app-properties.service';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit {

  errorMessage: string;
  errorDetails: string;
  errorId: number;
  techSupport: string;
  production: boolean;

  constructor(
    private route: ActivatedRoute,
    private errorHandler: ErrorHandlerService,
    private appPropertiesService: AppPropertiesService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.errorId = this.route.snapshot.params.errorId;
    this.errorMessage = this.errorHandler.getMessage(+this.errorId);
    this.errorDetails = this.errorHandler.getDetails(+this.errorId);
    this.techSupport = this.appPropertiesService.getProperty('TECH_SUPPORT_EMAIL'); 
    this.production = environment.production;
  }

}
