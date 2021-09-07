import { Component, Input, OnDestroy, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FsPlanWorkflowControllerService, FundingReqStatusHistoryDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { Options } from 'select2';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { ApprovingStatuses, TerminalStatuses, WorkflowAction, WorkflowActionCode, WorkflowModel } from 'src/app/funding-request/workflow/workflow.model';
import { BudgetInfoComponent } from '../../cans/budget-info/budget-info.component';
import { Alert } from 'src/app/alert-billboard/alert';
import { FundingRequestIntegrationService } from 'src/app/funding-request/integration/integration.service';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { DatepickerFormatter } from 'src/app/datepicker/datepicker-adapter-formatter';

const approverMap = new Map<number, any>();
let addedApproverMap = new Map<number, any>();

@Component({
  selector: 'app-plan-workflow',
  templateUrl: './plan-workflow.component.html',
  styleUrls: ['./plan-workflow.component.css'],
  providers: [
    {provide: NgbDateParserFormatter, useClass: DatepickerFormatter}
  ]
})
export class PlanWorkflowComponent implements OnInit, OnDestroy {
  @Input() readonly = false;
  @Output() actionEmitter = new EventEmitter<string>();
  budgetInfoComponent: BudgetInfoComponent;

  approverInitializationSubscription: Subscription;
  approverChangeSubscription: Subscription;
  requestHistorySubscription: Subscription;

  options: Options;
  comments = '';
  buttonLabel = 'Process Action';
  addApproverLabel = 'Add Approver(s)';
  // buttonDisabled = true;
  workflowActions: any[];

  alert: Alert;
  showAddApprover = false;
  requestStatus: FundingReqStatusHistoryDto = {};
  approvingState = false;
  terminalRequest = false;
  showSplMeetingDate = false;
  splMeetingDate: string;

  validationError: any = {};

  private _selectedValue: number;
  private _selectedWorkflowAction: WorkflowAction;

  set selectedValue(value: number) {
    this._selectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    // if (this._selectedWorkflowAction) {
    this.workflowModel.addAdditionalApprover(user, this._selectedWorkflowAction ? this._selectedWorkflowAction.action : null);
    // }
    setTimeout(() => {
      this._selectedValue = null;
    }, 0);
  }

  get selectedValue(): number {
    return this._selectedValue;
  }

  onActionChange(value: string): void {
    this.actionEmitter.emit(value);
  }

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private workflowService: FsPlanWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private planModel: PlanModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) {
  }

  ngOnDestroy(): void {
    if (this.approverInitializationSubscription) {
      this.approverInitializationSubscription.unsubscribe();
    }
    if (this.approverChangeSubscription) {
      this.approverChangeSubscription.unsubscribe();
    }
    if (this.requestHistorySubscription) {
      this.requestHistorySubscription.unsubscribe();
    }
  }

  storeData(data: any): any {
    const data2 = data.filter((user) => {
      if (user.classification !== 'EMPLOYEE') {
        return false;
      } else if (addedApproverMap.get(Number(user.id))) {
        return false;
      }
      return true;
    });
    data2.forEach(user => {
      approverMap.set(Number(user.id), user);
    });
    return data2;

  }

  ngOnInit(): void {
    this.logger.debug('PlanWorkflowComponent ngOnInit()');
    const callback = this.storeData;
    this.options = {
      allowClear: true,
      minimumInputLength: 2,
      closeOnSelect: true,
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/lookup/funding-request/approvers/',
        delay: 500,
        type: 'POST',
        data(params): any {
          return {
            term: params.term
          };
        },
        processResults(data): any {
          const data2 = callback(data);
          return {
            results: $.map(data2, user => {
              return {
                id: user.id,
                text: user.fullName,
                user
              };
            })
          };
        }
      }
    };

    this.approverInitializationSubscription = this.requestIntegrationService.approverInitializationEmitter.subscribe(
      () => {
        this.comments = '';
        this.workflowActions = this.workflowModel.getWorkflowList();
        this.logger.debug('workflow actions = ', this.workflowActions);
      }
    );

    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => { addedApproverMap = this.workflowModel.addedApproverMap;
              this.alert = null;
              this.isFormValid();
      }
    );

    this.requestHistorySubscription = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );
  }

  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      if (!item.endDate) {
        this.requestStatus = item;
        this.requestStatus = {statusCode: 'DRAFT'};
        this.approvingState = ApprovingStatuses.includes(this.requestStatus.statusCode);
        this.terminalRequest = TerminalStatuses.includes(this.requestStatus.statusCode);
        this.logger.debug('current requestStatus= ', item);
        return;
      }
    });
  }

  isApprover(): boolean {
    return this.workflowModel.isUserNextInChain && this.approvingState;
  }

  // showApprovedCosts(): boolean {
  //   return !this.requestModel.isSkip() && (this.workflowModel.approvedScientifically ||
  //     (this.workflowModel.isScientificApprover && this.approvingState));
  // }

  // showGmInfo(): boolean {
  //   return !this.requestModel.isSkip() && ( this.workflowModel.approvedByGM ||
  //     (this.workflowModel.isGMApprover && this.approvingState) );
  // }

  get selectedWorkflowAction(): WorkflowActionCode {
    return (this._selectedWorkflowAction) ? this._selectedWorkflowAction.action : null;
  }

  set selectedWorkflowAction(action: WorkflowActionCode) {
    this.alert = null;
    this.validationError = {};
    this._selectedWorkflowAction = this.workflowModel.getWorkflowAction(action);
    if (!this._selectedWorkflowAction) {
      this.showAddApprover = false;
      this.buttonLabel = 'Process Action';
      return;
    }

    this.buttonLabel = this._selectedWorkflowAction.actionButtonText;
    this.addApproverLabel = this._selectedWorkflowAction.action === WorkflowActionCode.REASSIGN ? 'Select Approver' : 'Add Approver(s)';
    this.showAddApprover = this._selectedWorkflowAction.newApproverRequired;
    this.workflowModel.prepareApproverListsForView(this._selectedWorkflowAction.action);

  }

  get buttonDisabled(): boolean {
    if (!this._selectedWorkflowAction) {
      return true;
    }

    return false;
  }

  get commentsRequired(): boolean {
    return this._selectedWorkflowAction?.commentsRequired;
  }

  get newApproverRequired(): boolean {
    return this._selectedWorkflowAction?.newApproverRequired;
  }

  submitWorkflow(): void {
    this.alert = null;
    this.validationError = {};
    let valid = true;
    // if ((this.gmInfoComponent && !this.gmInfoComponent.isFormValid()) ||
    //     (this.approvedCostsComponent && !this.approvedCostsComponent?.isFormValid()) ) {
    //   valid = false;
    // }
    if (! this.isFormValid()) {
      valid = false;
    }

    if (!valid) {
      this.alert = {type: 'danger',
      message: 'Please correct the errors identified above.',
      title: ''};
      return;
    }
    const action: WorkflowActionCode = this._selectedWorkflowAction.action;
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.fprId = this.planModel.fundingPlanDto.fprId;
    dto.comments = this.comments;
    dto.action = action;
    if ((action === WorkflowActionCode.APPROVE_ROUTE || action === WorkflowActionCode.ROUTE_APPROVE) &&
      this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0) {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map(a => {
        return a.approverLdap;
      });
    } else if (action === WorkflowActionCode.REASSIGN) {
      dto.reassignedApproverId = this.workflowModel.pendingApprovers[0].approverLdap;
    }
    // complete the request when last in chain approving.
    if (this.workflowModel.lastInChain) {
      if (action === WorkflowActionCode.APPROVE ||
        action === WorkflowActionCode.APPROVE_COMMENT) {
        dto.completeRequest = true;
      }
    }
//     // set approved costs cans if scientific approver;
//     if (this.workflowModel.isScientificApprover
//       && this.workflowModel.isApprovalAction(action)
//       && !this.requestModel.isSkip() ) {
//         dto.requestCans = this.requestModel.requestCans;
//         this.logger.debug('scientific approver:', dto.requestCans);
// //      dto.requestCans = this.approvedCostsComponent.getCans();
//     }

    if (this.workflowModel.isFinancialApprover
      && this.workflowModel.isApprovalAction(action)
      && this.workflowModel.budgetDocAdded) {
        alert('WARNING: If the uploaded budget document(s) are not in eGrants, please send the document(s) to the appropriate Grants Management Specialist to add it the grant file in eGrants.');
    }

    // this.logger.debug(this.workflowModel.isApprovalAction(action));
    // this.logger.debug(this.budgetInfoComponent?.editing);
    // // if (this.workflowModel.isApprovalAction(action) && this.budgetInfoComponent?.editing) {
    // //   this.budgetInfoComponent.refreshRequestCans();
    // //   dto.requestCans = this.requestModel.requestCans;
    // // }

    // if (this.workflowModel.isGMApprover
    //   && this.workflowModel.isApprovalAction(action)
    //   && !this.requestModel.isSkip() ) {
    //   dto.gmInfo = this.gmInfoComponent?.getGmInfo();
    // }

    this.logger.debug('workflow dto for submission is ', dto);
    this.workflowService.submitPlanWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('submit workflow returned okay ', result);
        // if (dto.gmInfo) {
        //   this.setGmInfoToRequestModel(dto.gmInfo);
        // }
        this.workflowModel.initializeForPlan(dto.fprId);
        this.showAddApprover = false;
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
      },
      (error) => {
        this.logger.error('submit workflow returned error', error);
      }
    );
  }

  // setGmInfoToRequestModel(gmInfo: GmInfoDto): void {
  //   this.requestModel.requestDto.actionType = gmInfo.actionType;
  //   this.requestModel.requestDto.pfrSpecFullName = gmInfo.defaultSpecFullName;
  //   this.requestModel.requestDto.pfrBkupSpecNpeId = gmInfo.bkupSpecNpeId;
  //   this.requestModel.requestDto.pfrBkupSpecFullName = gmInfo.bkupSpecFullName;
  // }

  isFormValid(): boolean {
    let valid = true;
    this.validationError = {};
    if ( this._selectedWorkflowAction?.commentsRequired && !this.comments ) {
      valid = false;
      this.validationError.comments_missing = true;
    }
    if ( this._selectedWorkflowAction?.newApproverRequired && !this.workflowModel.hasNewApprover ) {
      valid = false;
      this.validationError.approver_missing = true;
    }
    return valid;
  }

}
