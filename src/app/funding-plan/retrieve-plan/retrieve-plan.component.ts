import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { ConversionActivityCodes } from '../../type4-conversion-mechanism/conversion-activity-codes';
import { CanManagementService } from '../../cans/can-management.service';

@Component({
  selector: 'app-retrieve-plan',
  templateUrl: './retrieve-plan.component.html',
  styleUrls: ['./retrieve-plan.component.css']
})
export class RetrievePlanComponent implements OnInit {
  fprId: number;
  error = '';

  constructor(private router: Router,
              private route: ActivatedRoute,
              private requestModel: RequestModel,
              private requestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService,
              private canManagementService: CanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.fprId = this.route.snapshot.params.fprId;
    if (this.fprId) {
      this.requestService.retrieveFundingRequestUsingGET(this.fprId).subscribe(
        (result) => {
          this.requestModel.reset();
          this.requestModel.title = 'View Request Details for';
          this.requestModel.returnToRequestPageLink = true;
          this.requestModel.requestDto = result.requestDto;
          this.requestModel.grant = result.grantDto;
          this.requestModel.requestDto.financialInfoDto.requestorNpnId = this.requestModel.requestDto.requestorNpnId;
          if (this.requestModel.requestDto.scheduledApprovers && this.requestModel.requestDto.scheduledApprovers.length > 0) {
            this.requestModel.mainApproverCreated = true;
            this.requestModel.captureApproverCriteria();
          }
          this.requestModel.requestDto.financialInfoDto.suppAddYearFlag = this.requestModel.requestDto.divSuppAddYearFlag;
          this.requestModel.requestDto.financialInfoDto.suppNewFlag = this.requestModel.requestDto.divSuppNewFlag;
          if (this.requestModel.requestDto.divSuppAddYearFlag === 'Y') {
            this.requestModel.supplementType = '2';
          } else if (this.requestModel.requestDto.divSuppNewFlag === 'Y') {
            this.requestModel.supplementType = '1';
          }

          const conversionActivityCode = ConversionActivityCodes.includes(this.requestModel.requestDto.conversionActivityCode)
            ? this.requestModel.requestDto.conversionActivityCode : null;

          this.requestService.getFundingSourcesUsingGET(this.requestModel.requestDto.frtId,
            this.requestModel.grant.fullGrantNum,
            this.requestModel.requestDto.financialInfoDto.fy,
            this.requestModel.requestDto.requestorNpnId,
            this.requestModel.requestDto.requestorCayCode,
            conversionActivityCode).subscribe(result1 => {
            this.requestModel.programRecommendedCostsModel.fundingSources = result1;
            this.requestModel.restoreLineItems();
          });

          this.canManagementService.getRequestCans(this.requestModel.requestDto.frqId).subscribe(result2 => {
            this.requestModel.requestCans = result2;
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
          this.router.navigate(['/request/step4']);
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