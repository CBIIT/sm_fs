import {Component, Inject, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {errorObject, isNumeric} from 'rxjs/internal-compatibility';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestValidationService} from '../../model/funding-request-validation-service';
import {FundingRequestErrorCodes} from '../../model/funding-request-error-codes';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {


  constructor(private router: Router, private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService,
              private logger: NGXLogger,
              private fundingRequestValidationService: FundingRequestValidationService) {
  }

  ngOnInit(): void {
    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }
    this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
        this.requestModel.requestDto.grantAwarded = result;
        this.logger.debug('Appl Periods/Grant awards:', result);
      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );
    this.requestModel.requestDto.pdNpnId = this.requestModel.grant.pdNpnId;
    this.fundingRequestValidationService.raiseError.subscribe(e => {
      this.showError(e);
    });
    this.fundingRequestValidationService.resolveError.subscribe(e => {
      this.clearError(e);
    });
  }

  saveAndContinue(): void {
    this.saveFundingRequest('/request/step3');
  }

  saveAsDraft(): void {
    this.saveFundingRequest('/request/step4');
  }

  prevStep(): void {
    // TODO - alert for unsaved changes?
    this.router.navigate(['/request/step1']);
  }

  get grant(): NciPfrGrantQueryDto {
    return this.model.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  saveFundingRequest(navigate: string): void {
    if (!this.isSaveable()) {
      this.logger.error('Can\'t save at this point');
      return;
    }
    // TODO: make sure model is properly constructed
    this.logger.debug(JSON.stringify(this.requestModel.requestDto));
    this.fsRequestControllerService.saveRequestUsingPOST(this.requestModel.requestDto).subscribe(
      result => {
        this.requestModel.requestDto = result;
        if (navigate) {
          this.router.navigate([navigate]);
        }

        this.logger.debug(JSON.stringify(this.requestModel.requestDto));

      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );
  }

  isSaveable(): boolean {
    if (!this.model.canSave()) {
      const errorCodes = this.model.getValidationErrors();
      errorCodes.forEach(e => {
        this.fundingRequestValidationService.raiseError.next(e);
      });
      return false;
    }
    return true;
  }

  requestTypeSelected(): boolean {
    return isNumeric(this.requestModel.requestDto.frtId);
  }

  canGoBack(): boolean {
    return this.model.requestDto.frqId === undefined;
  }

  private showError(e: FundingRequestErrorCodes): void {
    this.logger.info('handling error code', e);
  }

  private clearError(e: FundingRequestErrorCodes): void {
    this.logger.info('clear error code', e);
  }
}
