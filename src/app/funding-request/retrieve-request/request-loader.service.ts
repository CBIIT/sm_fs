import { Injectable } from '@angular/core';
import { FsRequestControllerService } from '@cbiit/i2efsws-lib';
import { RequestModel } from '../../model/request/request-model';
import { ConversionActivityCodes } from '../../type4-conversion-mechanism/conversion-activity-codes';
import { CanManagementService } from '../../cans/can-management.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { NGXLogger } from "ngx-logger";

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
    private integrationService: FundingRequestIntegrationService,
    private requestModel: RequestModel) {
  }

  public loadRequest(frqId: number, successFn: SuccessFunction, errorFn: ErrorFunction): void {
    this.logger.info(`Loading request ${frqId}.`);
    this.requestService.retrieveFundingRequest(frqId).subscribe(
      (result) => {
        this.logger.info(`Request ${frqId} succesfully loaded. Proceeding with initialization.`);
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

        this.requestService.getFundingSourcesByNpnId(
          this.requestModel.grant.fullGrantNum,
          this.requestModel.requestDto.requestorNpnId,
          this.requestModel.requestDto.requestorCayCode,
          this.requestModel.requestDto.frtId,
          this.requestModel.requestDto.requestFy,
          conversionActivityCode).subscribe(result1 => {
          this.requestModel.programRecommendedCostsModel.fundingSources = result1;

          const foundSources: number[] = result1.map(r1 => r1.fundingSourceId);

          // FS-1387: funding sources need to come back in the same order they were inserted into the DB,
          // so we need to make sure they are sorted by ID when we retrieve them.  The underlying API function
          // does, and JavaScript sets preserve insertion order, so we are good to go here.
          const selectedIds = new Set<number>();
          this.requestModel.requestDto.financialInfoDto.fundingReqBudgetsDtos.forEach(b => {
            selectedIds.add(b.fseId);
          });

          const additionalSources: number[] = Array.from(selectedIds).filter(s => !foundSources.includes(s));
          if (additionalSources && additionalSources.length !== 0) {
            this.requestService.retrieveFundingSources(additionalSources).subscribe(res3 => {
              const tmp = this.requestModel.programRecommendedCostsModel.fundingSources;
              res3.forEach(r => tmp.push(r));
              this.requestModel.programRecommendedCostsModel.fundingSources = tmp;
            });
          }

          this.requestModel.programRecommendedCostsModel.selectedFundingSourceIds = selectedIds;

          this.canManagementService.getRequestCans(this.requestModel.requestDto.frqId).subscribe(result2 => {
            this.requestModel.requestCans = result2;
            this.integrationService.requestCanLoadedEmitter.next();
          });

          this.requestService.getApplPeriods(this.requestModel.grant.applId).subscribe(result2 => {
            this.requestModel.programRecommendedCostsModel.grantAwarded = result2;
            this.requestModel.restoreLineItems();

            this.requestModel.requestDto.financialInfoDto.fundingRequestId = this.requestModel.requestDto.frqId;
            /*
             * TODO - synchronize
             * Note: the location of this function call is arbitrary; I inserted at the point where the original
             * version was doing its routing. Ideally, we should synchronize all the above service calls and only
             * invoke the success function when they're all complete.
             */
            this.logger.info(`Request ${frqId} succesfully loaded and initialized. Proceeding with navigation.`);
            if (successFn) {
              successFn();
            }
          });
        });
      },
      (error) => {
        this.logger.error(`loadRequest(${frqId} failed`, error);
        if (errorFn) {
          errorFn(error);
        }
      }
    );
  }
}
