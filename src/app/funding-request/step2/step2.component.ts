import {AfterContentChecked, Component, Inject, Input, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestValidationService} from '../../model/funding-request-validation-service';
import {FundingRequestTypes} from '../../model/funding-request-types';
import {ProgramRecommendedCostsComponent} from '../../program-recommended-costs/program-recommended-costs.component';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {

  @ViewChild(ProgramRecommendedCostsComponent) prc: ProgramRecommendedCostsComponent;


  constructor(private router: Router, private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }
    this.logger.debug('Request type:', this.requestModel.requestDto.financialInfoDto.requestTypeId);

    this.requestModel.setStepLinkable(2, true);
    this.logger.debug('Selected DOCS in step 2 init:', this.requestModel.requestDto.financialInfoDto.otherDocText);
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
    this.requestModel.prepareBudgets();
    this.logger.debug(JSON.stringify(this.requestModel.requestDto));
    this.fsRequestControllerService.saveRequestUsingPOST(this.requestModel.requestDto).subscribe(
      result => {
        this.requestModel.requestDto = result;
        this.logger.debug(JSON.stringify(this.requestModel.requestDto));

        if (navigate) {
          this.router.navigate([navigate]);
        }
      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );
  }

  isSaveable(): boolean {
    if (!this.model.canSave()) {
      // const errorCodes = this.model.getValidationErrors();
      // errorCodes.forEach(e => {
      //   this.fundingRequestValidationService.raiseError.next(e);
      // });
      return false;
    }
    return true;
  }

  requestTypeSelected(): boolean {
    return Number(this.requestModel.requestDto.frtId) &&
      !([FundingRequestTypes.SKIP, FundingRequestTypes.SKIP__NCI_RFA].includes(Number(this.requestModel.requestDto.frtId)));
  }

  canGoBack(): boolean {
    return this.model.requestDto.frqId === undefined;
  }
}
