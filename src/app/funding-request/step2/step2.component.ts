import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RequestModel } from '../../model/request/request-model';
import { FsRequestControllerService, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { AppPropertiesService } from '../../service/app-properties.service';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestTypes } from '../../model/request/funding-request-types';
import { ProgramRecommendedCostsComponent } from '../../program-recommended-costs/program-recommended-costs.component';
import { Alert } from '../../alert-billboard/alert';
import { NgForm } from '@angular/forms';
import { FundingSourceTypes } from '../../model/request/funding-source-types';
import SubmitEvent = JQuery.SubmitEvent;
import { RequestApproverService } from '../approver/approver.service';
import { NavigationStepModel } from '../step-indicator/navigation-step.model';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {
  @ViewChild(ProgramRecommendedCostsComponent) prc: ProgramRecommendedCostsComponent;
  @ViewChild('step2Form', { static: false }) step2Form: NgForm;

  alerts: Alert[] = [];

  constructor(private router: Router, private requestModel: RequestModel,
              private requestApproverService: RequestApproverService,
              private fsRequestControllerService: FsRequestControllerService,
              private navigationModel: NavigationStepModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }
    this.navigationModel.setStepLinkable(2, true);
  }

  saveAndContinue(): void {
    this.saveFundingRequest('/request/step3');
  }

  saveAsDraft(): void {
    this.saveFundingRequest('/request/step4');
  }

  prevStep(): void {
    // TODO - alert for unsaved changes?
    if (this.step2Form.dirty && confirm('Unsaved changes will be lost if you continue.')) {
      this.router.navigate(['/request/step1']);
    }

  }

  get grant(): NciPfrGrantQueryDto {
    return this.model.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  saveFundingRequest(navigate: string): void {
    if (!this.isSaveable()) {
      this.model.pendingAlerts.push({
        type: 'danger',
        message: 'Unexpected error encountered while saving the request. Please contact app support.',
        title: ''
      });
    }
    this.requestModel.clearAlerts();
    // TODO: make sure model is properly constructed
    this.requestModel.prepareBudgetsAndSetFinalLoa();
    this.logger.debug(JSON.stringify(this.requestModel.requestDto));
    this.fsRequestControllerService.saveRequestUsingPOST(this.requestModel.requestDto).subscribe(
      result => {
        this.requestModel.requestDto = result;
        this.requestModel.pendingAlerts.push({
          type: 'success',
          message: 'You have successfully saved your request',
          title: ''
        });
        this.logger.debug(JSON.stringify(this.requestModel.requestDto));
        // always go to next step even if create approver fails. that's behavior before moving
        // create approvers here.
        this.fsRequestControllerService.getRequestBudgetsUsingGET(result.frqId).subscribe(
          result1 => {
            this.requestModel.requestDto.financialInfoDto.fundingReqBudgetsDtos = result1;
            this.requestModel.restoreLineItemIds();
            this.logger.debug('loaded budgets', result);
          });
        this.requestApproverService.checkCreateApprovers().finally(
          () => {
            if (navigate) {
              this.router.navigate([navigate]);
            }
          });
      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error during save request ----- ' + error.message);
        this.logger.error('Request data: ', JSON.stringify(this.requestModel.requestDto));
        this.requestModel.pendingAlerts.push({
          type: 'danger',
          message: 'Unexpected system error encountered: \'' + error.message + '\'',
          title: ''
        });
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
    if (!this.requestModel.requestDto.frtId) {
      return false;
    }
    return Number(this.requestModel.requestDto.frtId) &&
      !([FundingRequestTypes.SKIP, FundingRequestTypes.SKIP__NCI_RFA].includes(Number(this.requestModel.requestDto.frtId)));
  }

  canGoBack(): boolean {
    return this.model.requestDto.frqId === undefined;
  }

  onSubmit(event: SubmitEvent): void {
    // @ts-ignore
    const action = event.submitter?.name;
    this.step2Form.control.updateValueAndValidity();
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
        message: 'Please correct the errors identified below.',
        title: ''
      };
      this.alerts.push(alert);
    }
  }

  get prcValid(): string | null {
    if (this.requestModel?.isSkip() || this.prc?.selectedFundingSources.length) {
      return 'Y';
    }
    return null;
  }

  isDiversitySupplement(): boolean {
    return this.requestModel?.isDiversitySupplement() || false;
  }

  showNewInvestigator(): boolean {
    return this.requestModel.grant.activityCode === 'R01' && ([1, 2].includes(Number(this.requestModel.grant.applTypeCode)));
  }

  showFinalLOA(): boolean {
    return !this.isMoonshot() && [Number(FundingRequestTypes.OTHER_PAY_COMPETING_ONLY),
      Number(FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS)].includes(Number(this.requestModel.requestDto.frtId));
  }

  isMoonshot(): boolean {
    return this.requestModel?.isMoonshot() || false;
  }

  isSkipRequest(): boolean {
    return this.requestModel?.isSkip() || false;
  }
}
