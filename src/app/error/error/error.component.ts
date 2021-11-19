import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environments/environment';
import { NGXLogger } from 'ngx-logger';

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
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.errorId = this.route.snapshot.params.errorId;
    this.errorMessage = this.errorHandler.getMessage(this.errorId);
    this.errorDetails = this.errorHandler.getDetails(this.errorId);
    this.techSupport = environment.techSupport;
    this.production = environment.production;
    this.logger.debug(environment);
  }

}
