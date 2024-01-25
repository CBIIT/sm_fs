import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import {
  FsPlanControllerService,
  FsPlanWorkflowControllerService,
  FundingReqStatusHistoryDto,
  FundingRequestQueryDto,
  WorkflowTaskDto,
} from '@cbiit/i2efsws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { Options } from 'select2';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import {
  ApprovingStatuses,
  TerminalStatuses,
  WorkflowAction,
  WorkflowActionCode,
  WorkflowModel,
} from 'src/app/funding-request/workflow/workflow.model';
import { Alert } from 'src/app/alert-billboard/alert';
import { FundingRequestIntegrationService } from 'src/app/funding-request/integration/integration.service';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { NgbCalendar, NgbDate, NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AppPropertiesService, DatepickerFormatter } from '@cbiit/i2ecui-lib';
import { FpGrantManagementComponent } from './fp-grant-management/fp-grant-management.component';
import { UploadBudgetDocumentsComponent } from 'src/app/upload-budget-documents/upload-budget-documents.component';
import { PlanManagementService } from '../service/plan-management.service';
import { FpCanWarning, FpWorkflowWarningModalComponent } from './fp-warning-modal/fp-workflow-warning-modal.component';
import { FpBudgetInformationComponent } from '../fp-budget-information/fp-budget-information.component';

const approverMap = new Map<number, any>();
let addedApproverMap = new Map<number, any>();

@Component({
  selector: 'app-plan-workflow',
  templateUrl: './plan-workflow.component.html',
  styleUrls: ['./plan-workflow.component.css'],
  providers: [{ provide: NgbDateParserFormatter, useClass: DatepickerFormatter }],
})
export class PlanWorkflowComponent implements OnInit, OnDestroy {
  @Input() readonly = false;
  @Output() actionEmitter = new EventEmitter<string>();
  @ViewChild(FpGrantManagementComponent) gmComponent: FpGrantManagementComponent;
  @ViewChild(FpWorkflowWarningModalComponent) fpWorkflowWarningModalComponent: FpWorkflowWarningModalComponent;

  budgetInfoComponent: FpBudgetInformationComponent;
  uploadBudgetDocumentsComponent: UploadBudgetDocumentsComponent;

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
  splMeetingDate: NgbDateStruct;
  maxDate: NgbDate = this.calendar.getToday();

  validationError: any = {};
  completedPfrs: FundingRequestQueryDto[];
  workflowStuckBy: 'ByCompletedPfrs';
  grantViewerUrl: string;

  private _selectedValue: number;
  private _selectedWorkflowAction: WorkflowAction;
  private _dirty = false;
  public disableWorkflow = false;

  set selectedValue(value: number) {
    this._selectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    // if (this._selectedWorkflowAction) {
    this.workflowModel.addAdditionalApprover(
      user,
      this._selectedWorkflowAction ? this._selectedWorkflowAction.action : null
    );
    // }
    setTimeout(() => {
      this._selectedValue = null;
    }, 0);
  }

  get selectedValue(): number {
    return this._selectedValue;
  }

  onActionChange(value: string): void {
    this._dirty = true;
    this.actionEmitter.emit(value);
    if (this.gmComponent) {
      this.gmComponent.isApprovalAction = this.workflowModel.isApprovalAction(WorkflowActionCode[value]);
    }
    this.logger.debug('budgetInfoComponent ', this.budgetInfoComponent);
    if (this.budgetInfoComponent) {
      this.budgetInfoComponent.checkCanValidation(this.workflowModel.isApprovalAction(WorkflowActionCode[value]));
    }
  }

  constructor(
    private requestIntegrationService: FundingRequestIntegrationService,
    private planManagementService: PlanManagementService,
    private workflowService: FsPlanWorkflowControllerService,
    private planService: FsPlanControllerService,
    private propertiesService: AppPropertiesService,
    private userSessionService: AppUserSessionService,
    private planModel: PlanModel,
    private workflowModel: WorkflowModel,
    private calendar: NgbCalendar,
    private router: Router,
    private logger: NGXLogger
  ) {}

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
    data2.forEach((user) => {
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
        },
      },
      ajax: {
        url: '/i2efsws/api/v1/fs/lookup/funding-request/approvers/',
        delay: 500,
        type: 'POST',
        data(params): any {
          return {
            term: params.term,
          };
        },
        processResults(data): any {
          const data2 = callback(data);
          return {
            results: $.map(data2, (user) => {
              return {
                id: user.id,
                text: user.fullName + ' [' + user.parentOrgPath + ']',
                user,
              };
            }),
          };
        },
      },
    };

    this.approverInitializationSubscription = this.requestIntegrationService.approverInitializationEmitter.subscribe(
      () => {
        this.comments = '';
        this.workflowActions = this.workflowModel.getWorkflowList();
        this.fetchCompletedPfr();
        this.logger.debug('workflow actions = ', this.workflowActions);
      }
    );

    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(() => {
      addedApproverMap = this.workflowModel.addedApproverMap;
      this.alert = null;
      this.checkIfStuck();
      this.isFormValid();
    });

    this.requestHistorySubscription = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );

    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  }

  fetchCompletedPfr(): void {
    if (this.workflowModel.isUserNextInChain && this.workflowModel.lastInChain) {
      this.planService.getCompletedPFRs(this.planModel.fundingPlanDto.fprId).subscribe(
        (result) => (this.completedPfrs = result),
        (error) => {
          this.logger.error('calling getCompletedPFRs failed ', error);
        }
      );
    }
  }

  parseRequestHistories(historyResult: FundingReqStatusHistoryDto[]): void {
    historyResult.forEach((item: FundingReqStatusHistoryDto) => {
      if (!item.endDate) {
        this.requestStatus = item;
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

  showGmInfo(): boolean {
    return this.workflowModel.approvedByGM || (this.workflowModel.isGMApprover && this.approvingState);
  }

  get selectedWorkflowAction(): WorkflowActionCode {
    return this._selectedWorkflowAction ? this._selectedWorkflowAction.action : null;
  }

  set selectedWorkflowAction(action: WorkflowActionCode) {
    this.alert = null;
    this.validationError = {};
    this._selectedWorkflowAction = this.workflowModel.getWorkflowAction(action);
    if (!this._selectedWorkflowAction) {
      this.showAddApprover = false;
      //      this.buttonLabel = 'Process Action';
      return;
    }

    //    this.buttonLabel = this._selectedWorkflowAction.actionButtonText;
    this.addApproverLabel =
      this._selectedWorkflowAction.action === WorkflowActionCode.REASSIGN ? 'Select Approver' : 'Add Approver(s)';
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

  get showSplMeetingDate(): boolean {
    return (
      this.workflowModel.isSplApprover && this.workflowModel.isApprovalAction(this._selectedWorkflowAction?.action)
    );
  }

  onSplMeetingDateSelect($event: any): void {
    this.isFormValid();
  }

  submitWorkflow(): void {
    this.alert = null;
    let valid = true;
    this.disableWorkflow = true;
    if (this.workflowStuckBy) {
      return;
    }
    if (
      (this.gmComponent && !this.gmComponent.isFormValid()) ||
      (this.uploadBudgetDocumentsComponent && !this.uploadBudgetDocumentsComponent.isFromValid())
    ) {
      valid = false;
    }
    if (!this.isFormValid()) {
      valid = false;
    }

    const action: WorkflowActionCode = this._selectedWorkflowAction.action;
    const canWarning: FpCanWarning = {};
    if (
      this.workflowModel.isFinancialApprover &&
      this.workflowModel.isApprovalAction(action) &&
      this.budgetInfoComponent
    ) {
      const canFormValid = this.budgetInfoComponent.isFormValid(canWarning);
      if (!canFormValid) {
        valid = false;
      } else {
        if (this.planModel.planUsesPoolRpgFunds() && this.planModel.planHasMultipleActivityCodes()) {
          if (
            !confirm(
              'WARNING: There is more than one activity code in this funding plan and the approval might affect proposed applications assigned to other Financial Analysts. Please coordinate with the other Financial Analysts or choose to approve and route the plan to them.'
            )
          ) {
            return;
          }
        }
      }
    }

    if (!valid) {
      this.alert = { type: 'danger', message: 'Please correct the errors identified above.', title: '' };
      this.disableWorkflow = false;
      return;
    }

    if (canWarning.duplicateCan || canWarning.missingCan || canWarning.nonDefaultCan) {
      this.fpWorkflowWarningModalComponent
        .openConfirmModal(canWarning)
        .then(() => {
          this.logger.debug('warning modal closed with yes ');
          this.submitWorkflowToBackend();
        })
        .catch(() => {
          this.disableWorkflow = false;
          this.logger.debug('warning modal closed with dismiss ');
        });
    } else {
      this.submitWorkflowToBackend();
    }
  }

  private submitWorkflowToBackend(): void {
    //  return;
    const action: WorkflowActionCode = this._selectedWorkflowAction.action;
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.fprId = this.planModel.fundingPlanDto.fprId;
    dto.updateStamp = this.planModel.fundingPlanDto.updateStamp;
    dto.lastChangeDate = this.planModel.fundingPlanDto.lastChangeDate;
    dto.currentStatusId = this.requestStatus.statusId;
    dto.requestorNpeId = this.planModel.fundingPlanDto.requestorNpeId;
    dto.comments = this.comments;
    dto.action = action;
    if (
      (action === WorkflowActionCode.APPROVE_ROUTE || action === WorkflowActionCode.ROUTE_APPROVE) &&
      this.workflowModel.additionalApprovers &&
      this.workflowModel.additionalApprovers.length > 0
    ) {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map((a) => {
        return a.approverLdap;
      });
    } else if (action === WorkflowActionCode.REASSIGN) {
      dto.reassignedApproverId = this.workflowModel.pendingApprovers[0].approverLdap;
    } else if (action === WorkflowActionCode.RETURN) {
      dto.requestCans = this.planModel.sanitizeCANDataAfterReturn();
    }
    // complete the request when last in chain approving.
    if (this.workflowModel.lastInChain) {
      if (action === WorkflowActionCode.APPROVE || action === WorkflowActionCode.APPROVE_COMMENT) {
        dto.completeRequest = true;
      }
    }
    // set SPL meeting date for SPL approver;
    if (this.workflowModel.isSplApprover && this.workflowModel.isApprovalAction(action) && this.splMeetingDate) {
      dto.splMeetingDate =
        String(this.splMeetingDate.month).padStart(2, '0') +
        '/' +
        String(this.splMeetingDate.day).padStart(2, '0') +
        '/' +
        String(this.splMeetingDate.year).padStart(4, '0');
      this.logger.debug('SPL approver, spl meeting date=' + this.splMeetingDate);
    }

    if (this.workflowModel.isFinancialApprover && this.workflowModel.isApprovalAction(action)) {
      // Get updated CAN data if necessary
      const updatedCANs = this.planModel.buildUpdatedCANDataModel();
      if (updatedCANs?.length > 0) {
        dto.requestCans = updatedCANs;
      }
    }

    if (this.workflowModel.isGMApprover && this.workflowModel.isApprovalAction(action)) {
      dto.planGmInfo = this.gmComponent?.getGmInfos();
    }

    this.logger.info('Workflow DTO for submission is ', dto);
    this.workflowService.submitPlanWorkflow(dto).subscribe(
      (result) => {
        this.logger.info('submit workflow returned okay ', result);
        this.planManagementService.planBudgetReadOnlyEmitter.next(true);

        this.workflowModel.initializeForPlan(dto.fprId);
        if (this.workflowModel.isSplApprover && this.workflowModel.isApprovalAction(action) && this.splMeetingDate) {
          this.planModel.fundingPlanDto.splMeetingDate = new Date(dto.splMeetingDate);
          this.logger.info('set SplMeetingDate to planModel ' + this.planModel.fundingPlanDto.splMeetingDate);
        } else if (dto.action === WorkflowActionCode.RETURN) {
          this.planModel.fundingPlanDto.splMeetingDate = undefined;
        }
        this.showAddApprover = false;
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
      },
      (error) => {
        this.logger.error('submit workflow returned error', error);
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      }
    );
  }

  checkIfStuck(): void {
    if (
      (this._selectedWorkflowAction?.action === WorkflowActionCode.APPROVE ||
        this._selectedWorkflowAction?.action === WorkflowActionCode.APPROVE_COMMENT) &&
      this.approvingState &&
      this.workflowModel.lastInChain &&
      this.completedPfrs &&
      this.completedPfrs.length > 0
    ) {
      this.workflowStuckBy = 'ByCompletedPfrs';
    } else {
      this.workflowStuckBy = null;
    }
  }

  retrieveRequest(frqId: number): void {
    this.router.navigate(['/request/retrieve', frqId]);
  }

  isFormValid(): boolean {
    this.validationError = {};
    if (this.workflowStuckBy) {
      return false;
    }
    let valid = true;
    if (this._selectedWorkflowAction?.commentsRequired && !this.comments) {
      valid = false;
      this.validationError.comments_missing = true;
    }
    if (this._selectedWorkflowAction?.newApproverRequired && !this.workflowModel.hasNewApprover) {
      valid = false;
      this.validationError.approver_missing = true;
    }

    if (this.showSplMeetingDate && this.workflowModel.isApprovalAction(this.selectedWorkflowAction)) {
      if (!this.splMeetingDate) {
        this.validationError.splMeetingDate_missing = true;
        valid = false;
      } else {
        const today: NgbDate = this.calendar.getToday();
        if (today.before(this.splMeetingDate)) {
          this.validationError.splMeetingDate_future = true;
          valid = false;
        }
      }
    }
    return valid;
  }

  isDirty(): boolean {
    return this._dirty || this.workflowModel.hasNewApprover || this.gmComponent?.isFormDirty();
  }

  get showBudgetDocWarning(): boolean {
    return (
      this.workflowModel.isFinancialApprover &&
      this.workflowModel.isApprovalAction(this._selectedWorkflowAction?.action) &&
      this.workflowModel.budgetDocAdded
    );
  }

  onCommentsInput(): void {
    this._dirty = true;
    this.isFormValid();
  }
}
