import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import {
  FsRequestControllerService,
  FsWorkflowControllerService,
  FundingPlanQueryDto,
  FundingReqStatusHistoryDto,
  WorkflowTaskDto
} from '@cbiit/i2efsws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { Options } from 'select2';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import {
  ApprovingStatuses,
  TerminalStatuses,
  WorkflowAction,
  WorkflowActionCode,
  WorkflowModel
} from './workflow.model';
import { GmInfoComponent } from './gm-info/gm-info.component';
import { BudgetInfoComponent } from '../../cans/budget-info/budget-info.component';
import { ApprovedCostsComponent } from './approved-costs/approved-costs.component';
import { Alert } from 'src/app/alert-billboard/alert';
import { CanWarning, WorkflowWarningModalComponent } from './warning-modal/workflow-warning-modal.component';
import { UploadBudgetDocumentsComponent } from 'src/app/upload-budget-documents/upload-budget-documents.component';
import { Router } from '@angular/router';

const approverMap = new Map<number, any>();
let addedApproverMap = new Map<number, any>();

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css']
})
export class WorkflowComponent implements OnInit, OnDestroy {
  @Input() readonly = false;
  @ViewChild(ApprovedCostsComponent) approvedCostsComponent: ApprovedCostsComponent;
  @ViewChild(GmInfoComponent) gmInfoComponent: GmInfoComponent;
  @ViewChild(WorkflowWarningModalComponent) workflowWarningModalComponent: WorkflowWarningModalComponent;
  @Output() actionEmitter = new EventEmitter<string>();
  budgetInfoComponent: BudgetInfoComponent;
  uploadBudgetDocumentsComponent: UploadBudgetDocumentsComponent;

  approverInitializationSubscription: Subscription;
  approverChangeSubscription: Subscription;
  requestHistorySubscription: Subscription;

  options: Options;
  comments = '';
  gmNotes='';
  specialNotes='';
  activeNotes=''
  buttonLabel = 'Process Action';
  addApproverLabel = 'Add Approver(s)';
  workflowActions: any[];

  alert: Alert;
  showAddApprover = false;
  requestStatus: FundingReqStatusHistoryDto = {};
  approvingState = false;
  terminalRequest = false;
  showCreateType = false;

  validationError: any = {};
  completedPfrs: FundingPlanQueryDto[];
  workflowStuckBy: 'ByCompletedPfrs';
  isApprovalAction = false;

  private _selectedValue: number;
  private _selectedWorkflowAction: WorkflowAction;
  public disableWorkflowButton = false;
  set selectedValue(value: number) {
    this._selectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    this.workflowModel.addAdditionalApprover(user, this._selectedWorkflowAction ? this._selectedWorkflowAction.action : null);
    setTimeout(() => {
      this._selectedValue = null;
    }, 0);
  }

  get selectedValue(): number {
    return this._selectedValue;
  }

  onActionChange(value: string): void {
    this.actionEmitter.emit(value);
    const approvalAction =  this.workflowModel.isApprovalAction(WorkflowActionCode[value]);
    this.isApprovalAction = approvalAction;
    if (this.gmInfoComponent) {
      this.gmInfoComponent.isApprovalAction = approvalAction;
    }
    if (this.budgetInfoComponent) {
      this.budgetInfoComponent.isApprovalAction = approvalAction;
    }

    if (approvalAction && this.workflowModel.isFcNci && this.requestModel.isAddFunds() && !(this.requestModel.isPayType4() && (this.requestModel.is4R00() || this.requestModel.isK99()))) {
      this.showCreateType = true;
    }
    else {
      this.showCreateType = false;
    }
  }

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private workflowService: FsWorkflowControllerService,
              private requestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private router: Router,
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
        url: '/i2efsws/api/v1/fs/lookup/funding-request/approvers/',
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
                text: user.fullName + ' [' + user.parentOrgPath + ']',
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
        this.fetchCompletedPfr();
        this.specialNotes = this.workflowModel.siNoteText?this.workflowModel.siNoteText:'';
        this.gmNotes = this.workflowModel.gmsNoteText?this.workflowModel.gmsNoteText:'';
        this.activeNotes = this.workflowModel.acNoteText?this.workflowModel.acNoteText:'';
        this.showCreateType = false;
        this.logger.debug('workflow actions = ', this.workflowActions);
      }
    );

    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => {
        addedApproverMap = this.workflowModel.addedApproverMap;
        this.alert = null;
        this.checkIfStuck();
        this.isFormValid();
      }
    );

    this.requestHistorySubscription = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );
  }

  get showBudgetDocWarning(): boolean {
    return this.workflowModel.isFinancialApprover
    && this.workflowModel.isApprovalAction(this._selectedWorkflowAction?.action)
    && this.workflowModel.budgetDocAdded;
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

  isGMLeaderShip():boolean{
    return this.userSessionService.isGMLeaderShipRole();
  }

  showApprovedCosts(): boolean {
    return !this.requestModel.isSkip() && (this.workflowModel.approvedScientifically ||
      (this.workflowModel.isScientificApprover && this.approvingState));
  }

  showGmInfo(): boolean {
    return !this.requestModel.isSkip() && ( this.workflowModel.approvedByGM ||
      (this.workflowModel.isGMApprover && this.approvingState) );
  }

  get selectedWorkflowAction(): WorkflowActionCode {
    return (this._selectedWorkflowAction) ? this._selectedWorkflowAction.action : null;
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

  submitWorkflow($event: MouseEvent): void {
    $event.preventDefault();
    this.logger.info(`Starting submit workflow for frqId#${this.requestModel.requestDto.frqId}, action = ${this._selectedWorkflowAction.action}`);

    this.alert = null;
    this.validationError = {};
    let valid = true;
    this.disableWorkflowButton = true;

    if (this.gmInfoComponent && !this.gmInfoComponent.isFormValid()) {
      this.logger.info(`GM info form invalid for frqId#${this.requestModel.requestDto.frqId}`);
      valid = false;
    }

    if (this.approvedCostsComponent && !this.approvedCostsComponent?.isFormValid()) {
      this.logger.info(`Approved costs form invalid for frqId#${this.requestModel.requestDto.frqId}`);
      valid = false;
    }

    if (this.uploadBudgetDocumentsComponent && !this.uploadBudgetDocumentsComponent.isFromValid()) {
      this.logger.info(`Budget documents form invalid for frqId#${this.requestModel.requestDto.frqId}`);
      valid = false;
    }

    if (!this.isFormValid()) {
      this.logger.info(`Workflow form invalid for frqId#${this.requestModel.requestDto.frqId}`);
      valid = false;
    }

    const action: WorkflowActionCode = this._selectedWorkflowAction.action;
    const canWarning: CanWarning = {};
    if (this.workflowModel.isApprovalAction(action) && this.budgetInfoComponent?.editing) {
      const canFormValid = this.budgetInfoComponent.isFormValid(canWarning);
      if (!canFormValid) {
        this.logger.info(`Budget info form invalid for frqId#${this.requestModel.requestDto.frqId}`);
        valid = false;
      }
    }

    if (!valid) {
      this.alert = {type: 'danger',
      message: 'Please correct the errors identified above.',
      title: ''};
      this.disableWorkflowButton = false;
      return;
    }

    if (canWarning.duplicateCan || canWarning.missingCan || canWarning.nonDefaultCan) {
      this.logger.info(`Opening CAN warning modal for frqId#${this.requestModel.requestDto.frqId}`);
      this.workflowWarningModalComponent.openConfirmModal(canWarning).then( () => {
        this.logger.info(`CAN warning modal closed for frqId#${this.requestModel.requestDto.frqId}`);
        this.submitWorkflowToBackend();
      }).catch(() => {
        this.logger.info(`CAN warning modal dismissed for frqId#${this.requestModel.requestDto.frqId}`);
        this.disableWorkflowButton = false;
      });
    }
    else {
      this.submitWorkflowToBackend();
    }
  }

  private submitWorkflowToBackend(): void {
    this.logger.info(`Form validation successful; submitting workflow for frqId#${this.requestModel.requestDto.frqId} to backend`);
    const action: WorkflowActionCode = this._selectedWorkflowAction.action;
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.frqId = this.requestModel.requestDto.frqId;
    dto.currentStatusId = this.requestStatus.statusId;
    dto.comments = this.comments;
    dto.siNote = this.specialNotes;
    dto.gmsNote = this.gmNotes;
    dto.acNote = this.activeNotes;
    dto.action = action;
    //36095
    dto.requestorNpeId = this.requestModel.requestDto.requestorNpeId;
    if ((action === WorkflowActionCode.APPROVE_ROUTE || action === WorkflowActionCode.ROUTE_APPROVE) &&
      this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0) {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map(a => {
        return a.approverLdap;
      });
      this.logger.info(`Additional approvers for frqId#${this.requestModel.requestDto.frqId}: ${dto.additionalApproverList}`);
    } else if (action === WorkflowActionCode.REASSIGN) {
      dto.reassignedApproverId = this.workflowModel.pendingApprovers[0].approverLdap;
      this.logger.info(`Reassigned approver for frqId#${this.requestModel.requestDto.frqId}: ${dto.reassignedApproverId}`);
    } else if (action === WorkflowActionCode.RETURN) {
      this.logger.info(`Returning frqId#${this.requestModel.requestDto.frqId} to npeId#${this.requestModel.requestDto.requestorNpeId}`);
      dto.requestCans = this.requestModel.requestCans;
      dto.requestCans?.forEach(c => {
        c.can = null;
        c.canDescription = null;
        c.phsOrgCode = null;
      });
    }

    // complete the request when last in chain approving.
    if (this.workflowModel.lastInChain) {
      this.logger.info(`Last in chain approving frqId#${this.requestModel.requestDto.frqId}`);
      if (action === WorkflowActionCode.APPROVE ||
        action === WorkflowActionCode.APPROVE_COMMENT) {
        dto.completeRequest = true;
        this.logger.info(`Setting completeRequest to true for frqId#${this.requestModel.requestDto.frqId}`);
      }
    }
    // set approved costs cans if scientific approver;
    if (this.workflowModel.isScientificApprover
      && this.workflowModel.isApprovalAction(action)
      && !this.requestModel.isSkip() ) {
        dto.requestCans = this.requestModel.requestCans;
        this.logger.info(`Scientific approver: setting requestCans for frqId#${this.requestModel.requestDto.frqId}`)
    }

    if (this.workflowModel.isApprovalAction(action) && this.budgetInfoComponent?.editing) {
      this.logger.info(`Approving request: refreshing request cans for frqId#${this.requestModel.requestDto.frqId}`)
      this.budgetInfoComponent.refreshRequestCans();
      dto.requestCans = this.requestModel.requestCans;
      if (this.workflowModel.isFcNci) {
        dto.nciFc = true;
        dto.oefiaCreateCode = this.requestModel.requestDto.oefiaCreateCode;
      }
    }

    if (this.workflowModel.isGMApprover
      && this.workflowModel.isApprovalAction(action)
      && !this.requestModel.isSkip() ) {
      dto.gmInfo = this.gmInfoComponent?.getGmInfo();
      this.logger.info(`GM approver: setting gmInfo for frqId#${this.requestModel.requestDto.frqId}`);
    }

    this.logger.info(`Workflow dto for submission: ${JSON.stringify(dto)}`);
    this.workflowService.submitWorkflow(dto).subscribe(
      (result) => {
        this.logger.info(`Submit workflow for frqId#${this.requestModel.requestDto.frqId} returned success`);
        this.workflowModel.initialize();
        this.showAddApprover = false;
        this.requestIntegrationService.requestSubmissionEmitter.next(dto);
      },
      (error) => {
        this.logger.error(`submit workflow for frqId#${this.requestModel.requestDto.frqId} returned error: ${JSON.stringify(error)}`);
        this.requestIntegrationService.requestSubmitFailureEmitter.next(error);
      }
    );
  }

  isFormValid(): boolean {
    let valid = true;
    this.validationError = {};
    if (this.workflowStuckBy) {
      return false;
    }
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

  checkIfStuck(): void {
    if ((this._selectedWorkflowAction?.action === WorkflowActionCode.APPROVE ||
        this._selectedWorkflowAction?.action === WorkflowActionCode.APPROVE_COMMENT) &&
      this.approvingState &&
      this.workflowModel.lastInChain &&
      this.completedPfrs &&
      this.completedPfrs.length > 0) {
      this.workflowStuckBy = 'ByCompletedPfrs';
    } else {
      this.workflowStuckBy = null;
    }
  }

  fetchCompletedPfr(): void {
    if (this.workflowModel.isUserNextInChain && this.workflowModel.lastInChain) {
      this.workflowService.getCompletedPlan( this.requestModel.requestDto.frqId).subscribe(
        result => this.completedPfrs = result,
        error => {
          this.logger.error('calling getCompletedPFRs failed ', error);
        }
      );
    }
  }

  retrievePlan(fprId: number): void {
    this.router.navigate(['/plan/retrieve', fprId]);
  }
}
