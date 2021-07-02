import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Component({
  selector: 'app-retrieve-request',
  templateUrl: './retrieve-request.component.html',
  styleUrls: ['./retrieve-request.component.css']
})
export class RetrieveRequestComponent implements OnInit {
  frqId: number;
  error = '';

  constructor(private router: Router,
              private route: ActivatedRoute,
              private requestModel: RequestModel,
              private requestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    this.frqId = this.route.snapshot.params.frqId;
    this.logger.debug('retrieving request frqId = ' + this.frqId);
    if (this.frqId) {
      this.requestService.retrieveFundingRequestUsingGET(this.frqId).subscribe(
        (result) => {
          this.logger.debug('retrieveFundingReuest returned ', result);
          this.requestModel.reset();
          this.requestModel.title = 'View Request';
          this.requestModel.requestDto = result.requestDto;
          this.requestModel.grant = result.grantDto;
          this.requestModel.requestDto.financialInfoDto.requestorNpnId = this.requestModel.requestDto.requestorNpnId;
          if (this.requestModel.requestDto.scheduledApprovers && this.requestModel.requestDto.scheduledApprovers.length > 0 ) {
            this.requestModel.mainApproverCreated = true;
            this.requestModel.captureApproverCriteria();
          }
          if (this.userSessionService.getEnvironment() === 'development') {
            this.router.navigate(['/request/review']);
          }
          else {
            this.router.navigate(['/request/step4']);
          }
        },
        (error) => {
          this.logger.error('retrieveFundingRequest failed ', error);
          this.error = 'not found';
        }
      );
    } else {
      this.error = 'not found';
    }

  }

}
