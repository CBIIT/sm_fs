import {Component, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestTypes} from '../../model/funding-request-types';
import {ProgramRecommendedCostsComponent} from '../../program-recommended-costs/program-recommended-costs.component';
import {Alert} from '../../alert-billboard/alert';
import {NgForm} from '@angular/forms';
import SubmitEvent = JQuery.SubmitEvent;

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {

  @ViewChild(ProgramRecommendedCostsComponent) prc: ProgramRecommendedCostsComponent;
  @ViewChild('step2Form', {static: false}) step2Form: NgForm;

  alerts: Alert[] = [];


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
    this.requestModel.prepareBudgetsAndSetFinalLoa();
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

  onSubmit(event: SubmitEvent): void {
    // @ts-ignore
    const action = event.submitter?.name;
    this.logger.debug(this.step2Form);
    this.alerts = [];
    if (this.step2Form.valid) {
      if (action === 'saveAsDraft') {
        this.saveAsDraft();
      } else {
        this.saveAndContinue();
      }
    } else {
      const alert: Alert = {
        type: 'danger',
        message: 'Please correct all errors below before saving',
        title: ''
      };
      this.alerts.push(alert);
    }
  }

  /**
   * This flag will allow us to add validation of the overall PRC form to the save buttons.  We'll assume that if there
   * is ta least one funding source selected that the form is correct. This method is tied to a field that is marked as
   * required, so an empty value should cause overall validation to fail.
   *
   * TODO - modify the logic for skip grants and other exceptions
   */
  prcValidated(): string | null {
    this.logger.debug('validating prc:', this.prc);

    return 'Y';

    // if (this.prc?.selectedFundingSources.length > 1) {
    //   return 'Y';
    // }
    // return null;
  }
}
