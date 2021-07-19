import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FsRequestControllerService} from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from 'ngx-logger';
import {RequestModel} from 'src/app/model/request/request-model';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';

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
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.frqId = this.route.snapshot.params.frqId;
    // this.logger.debug('retrieving request frqId = ' + this.frqId);
    if (this.frqId) {
      this.requestService.retrieveFundingRequestUsingGET(this.frqId).subscribe(
        (result) => {
          // this.logger.debug('retrieveFundingReuest returned ', JSON.stringify(result));
          this.requestModel.reset();
          this.requestModel.title = 'View Request Details for';
          this.requestModel.requestDto = result.requestDto;
          this.requestModel.grant = result.grantDto;
          this.requestModel.requestDto.financialInfoDto.requestorNpnId = this.requestModel.requestDto.requestorNpnId;
          if (this.requestModel.requestDto.scheduledApprovers && this.requestModel.requestDto.scheduledApprovers.length > 0) {
            this.requestModel.mainApproverCreated = true;
            this.requestModel.captureApproverCriteria();
          }

          this.requestService.getFundingSourcesUsingGET(this.requestModel.requestDto.frtId,
            this.requestModel.grant.fullGrantNum,
            this.requestModel.requestDto.financialInfoDto.fy,
            this.requestModel.requestDto.requestorNpnId,
            this.requestModel.requestDto.requestorCayCode).subscribe(result1 => {
            this.requestModel.programRecommendedCostsModel.fundingSources = result1;
            this.requestModel.restoreLineItems();
          });

          const selectedIds = new Set<number>();
          this.requestModel.requestDto.financialInfoDto.fundingReqBudgetsDtos.forEach(b => {
            selectedIds.add(b.fseId);
          });

          this.requestModel.programRecommendedCostsModel.selectedFundingSourceIds = selectedIds;

          this.requestService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result2 => {
            this.requestModel.programRecommendedCostsModel.grantAwarded = result2;
            this.requestModel.restoreLineItems();
          });

          this.requestModel.requestDto.financialInfoDto.fundingRequestId = this.requestModel.requestDto.frqId;

          this.router.navigate(['/request/review']);
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
