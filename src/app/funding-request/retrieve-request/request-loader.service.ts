import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../../model/request/request-model';
import { ConversionActivityCodes } from '../../type4-conversion-mechanism/conversion-activity-codes';
import { CanManagementService } from '../../cans/can-management.service';

export type SuccessFunction = () => void;
export type ErrorFunction = (s: string) => void;

@Injectable({
  providedIn: 'root'
})
export class RequestLoaderService {
  error: string;

  constructor(
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private canManagementService: CanManagementService,
    private requestModel: RequestModel) {
  }

  public loadRequest(frqId: number, successFn: SuccessFunction, errorFn: ErrorFunction): void {
    this.requestService.retrieveFundingRequestUsingGET(frqId).subscribe(
      (result) => {
        this.requestModel.reset();
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

          const foundSources: number[] = result1.map(r1 => r1.fundingSourceId);

          const selectedIds = new Set<number>();
          this.requestModel.requestDto.financialInfoDto.fundingReqBudgetsDtos.forEach(b => {
            selectedIds.add(b.fseId);

          });

          const additionalSources: number[] = Array.from(selectedIds).filter(s => !foundSources.includes(s));
          if (additionalSources && additionalSources.length !== 0) {
            this.requestService.retrieveFundingSourcesUsingGET(additionalSources).subscribe(res3 => {
              const tmp = this.requestModel.programRecommendedCostsModel.fundingSources;
              res3.forEach(r => tmp.push(r));
              this.requestModel.programRecommendedCostsModel.fundingSources = tmp;
            });
          }

          this.requestModel.programRecommendedCostsModel.selectedFundingSourceIds = selectedIds;

          this.canManagementService.getRequestCans(this.requestModel.requestDto.frqId).subscribe(result2 => {
            // this.logger.debug('request CANs', result2);
            this.requestModel.requestCans = result2;
            // const otherSources: number[] = result2.map(r => r.fseId).filter(b => !selectedIds.has(b));
            // // this.logger.debug('Found additional sources: ', otherSources);
            // if (otherSources && otherSources.length !== 0) {
            //   otherSources.forEach(s => this.requestModel.programRecommendedCostsModel.selectedFundingSourceIds.add(s));
            //   this.requestService.retrieveFundingSourcesUsingGET(otherSources)
            //     .subscribe(result3 => result3.forEach(r => this.requestModel.programRecommendedCostsModel.fundingSources.push(r)));
            // }
          });

          this.requestService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result2 => {
            this.requestModel.programRecommendedCostsModel.grantAwarded = result2;
            this.requestModel.restoreLineItems();

            this.requestModel.requestDto.financialInfoDto.fundingRequestId = this.requestModel.requestDto.frqId;
            /*
             * TODO - synchronize
             * Note: the location of this function call is arbitrary; I inserted at the point where the original
             * version was doing its routing. Ideally, we should synchronize all the above service calls and only
             * invoke the success function when they're all complete.
             */
            if (successFn) {
              successFn();
            }
          });
        });
      },
      (error) => {
        this.logger.error('retrieveFundingRequest failed ', error);
        if (errorFn) {
          errorFn(error);
        }
      }
    );
  }
}
