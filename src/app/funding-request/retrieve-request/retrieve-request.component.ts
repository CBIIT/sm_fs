import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { FsRequestControllerService } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { ConversionActivityCodes } from '../../type4-conversion-mechanism/conversion-activity-codes';
import { CanManagementService } from '../../cans/can-management.service';
import { RequestLoaderService, SuccessFunction } from './request-loader.service';

@Component({
  selector: 'app-retrieve-request',
  templateUrl: './retrieve-request.component.html',
  styleUrls: ['./retrieve-request.component.css']
})
export class RetrieveRequestComponent implements OnInit {
  frqId: number;
  path: string;
  error = '';

  constructor(private router: Router,
              private route: ActivatedRoute,
              private requestLoaderService: RequestLoaderService,
              private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.frqId = this.route.snapshot.params.frqId;
    this.path = this.route.snapshot.queryParams.forward || '/request/step4';

    if (this.frqId) {
      this.requestLoaderService.loadRequest(this.frqId, this.successFn.bind(this), this.errorFn.bind(this));
    } else {
      this.error = 'not found';
    }
  }

  successFn(): void {
    this.requestModel.title = 'View Request Details for';
    this.requestModel.returnToRequestPageLink = true;
    this.router.navigate([this.path]);
  }

  errorFn(e: string): void {
    this.error = e;
  }


}
