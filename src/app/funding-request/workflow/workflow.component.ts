import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FsWorkflowControllerService, FundingReqStatusHistoryDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { Options } from 'select2';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { setSyntheticLeadingComments } from 'typescript';
import { ApprovedCostsComponent } from './approved-costs/approved-costs.component';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { ApprovingStatuses, WorkflowAction, WorkflowActionCode, WorkflowModel } from './workflow.model';

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

  approverInitializationSubscription: Subscription;
  approverChangeSubscription: Subscription;
  requestHistorySubscription: Subscription;

  options: Options;
  comments = '';
  buttonLabel = 'Process Action';
  // buttonDisabled = true;
  workflowActions: any[];

  showAddApprover = false;
  requestStatus: FundingReqStatusHistoryDto = {};
  approvingState = false;

  private _selectedValue: number;
  private _selectedWorkflowAction: WorkflowAction;

  set selectedValue(value: number) {
    this._selectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
   // if (this._selectedWorkflowAction) {
    this.workflowModel.addAdditionalApprover(user, this._selectedWorkflowAction ? this._selectedWorkflowAction.action : null);
   // }
    setTimeout(() => {this._selectedValue = null; }, 0);
  }

  get selectedValue(): number {
    return this._selectedValue;
  }

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private workflowService: FsWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) { }

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
      }
      else if (addedApproverMap.get(Number(user.id))) {
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
      () => {this.workflowActions = this.workflowModel.getWorkflowList();
             this.logger.debug('workflow acitons = ', this.workflowActions); }
    );

    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => addedApproverMap = this.workflowModel.addedApproverMap
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
        const i = item.statusDescrip.search(/ by /gi);
        if (i > 0) {
          item.statusDescrip = item.statusDescrip.substring(0, i);
        }
        this.requestStatus = item;
        this.approvingState = ApprovingStatuses.indexOf(this.requestStatus.statusCode) > -1;
        this.logger.debug('requestStatus= ', item);
        return ;
      }
    });
  }

  isApprover(): boolean {
    return this.workflowModel.isUserNextInChain && this.approvingState;
  }

  showApprovedCosts(): boolean {
    return this.workflowModel.approvedScientifically ||
    (this.workflowModel.isScientificApprover && this.approvingState);
  }

  get selectedWorkflowAction(): WorkflowActionCode {
    return (this._selectedWorkflowAction) ? this._selectedWorkflowAction.action : null;
  }

  set selectedWorkflowAction(action: WorkflowActionCode) {
    this._selectedWorkflowAction = this.workflowModel.getWorkflowAction(action);
    if (!this._selectedWorkflowAction) {
      this.showAddApprover = false;
      this.buttonLabel = 'Process Action';
      return;

    }

    this.buttonLabel = this._selectedWorkflowAction.actionButtonText;
    // this.buttonDisabled = this._selectedWorkflowAction.commentsRequired || this._selectedWorkflowAction.newApproverRequired;

    this.showAddApprover = this._selectedWorkflowAction.newApproverRequired;
    this.workflowModel.prepareApproverListsForView(this._selectedWorkflowAction.action);
  }

  get buttonDisabled(): boolean {
    if (!this._selectedWorkflowAction) { return true; }

    if (this._selectedWorkflowAction.commentsRequired && (!this.comments || this.comments.length === 0)) {
      return true;
    }
    else if ( this._selectedWorkflowAction.newApproverRequired && (!this.workflowModel.hasNewApprover)) {
      return true;
    }

    return false;
  }

  submitWorkflow(): void {
    const action: WorkflowActionCode = this._selectedWorkflowAction.action;
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.frqId = this.requestModel.requestDto.frqId;
    dto.comments = this.comments;
    dto.action = action;
    if ((action === WorkflowActionCode.APPROVE_ROUTE || action === WorkflowActionCode.ROUTE_APPROVE) &&
       this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0 )
    {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map( a => {
        return a.approverLdap;
      });
    }
    else if (action === WorkflowActionCode.REASSIGN) {
      dto.reassignedApproverId = this.workflowModel.pendingApprovers[0].approverLdap;
    }
    // complete the request when last in chain approving.
    if (this.workflowModel.lastInChain) {
      if (action === WorkflowActionCode.APPROVE ||
          action === WorkflowActionCode.APPROVE_COMMENT ){
            dto.completeRequest = true;
          }
    }
    // set approved costs cans if scientific approver;
    this.setCansToDto(dto, action);
    this.logger.debug('workflow dto for submission is ', dto);
    this.workflowService.submitWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('submit workflow returned okay ', result);
        this.workflowModel.initialize();
        this.showAddApprover = false;
        this.requestIntegrationService.requestSubmissionEmitter.next(this.requestModel.requestDto.frqId);
      },
      (error) => {
        this.logger.error('submit workflow returned error', error);
      }
    );
  }

  setCansToDto(dto: WorkflowTaskDto, action: WorkflowActionCode): void {
     // TO-do, need to check if cans should be updated for all workflow actions for sci approvers
     if ( this.workflowModel.isScientificApprover) {
          dto.requestCans = this.approvedCostsComponent.getCans();
     }
  }
}
