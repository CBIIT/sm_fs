import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FsWorkflowControllerService, FundingReqStatusHistoryDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { Options } from 'select2';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { ApprovingStatuses, WorkflowAction, WorkflowModel } from './workflow.model';

const approverMap = new Map<number, any>();
let addedApproverMap = new Map<number, any>();

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css'],
  providers: [WorkflowModel]
})
export class WorkflowComponent implements OnInit, OnDestroy {
  @Input() readonly = false;

  approverInitializationSubscription: Subscription;
  approverChangeSubscription: Subscription;
  requestHistorySubscription: Subscription;

  options: Options;
  comments = '';
  buttonLabel = 'Process Action';
  // buttonDisabled = true;
  workflowActions: any[];

  showAddApprover = false;
  requestStatus: FundingReqStatusHistoryDto;
  private approvingState = false;

  private _selectedValue: number;
  private _selectedWorkflowAction: WorkflowAction;

  set selectedValue(value: number) {
    this._selectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    if (this._selectedWorkflowAction) {
      this.workflowModel.addAdditionalApprover(user, this._selectedWorkflowAction.action);
    }
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
      () => this.workflowActions = this.workflowModel.getWorkflowList()
    );

    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => addedApproverMap = this.workflowModel.addedApproverMap
    );

    this.requestHistorySubscription = this.requestIntegrationService.requestHistoryLoadEmitter.subscribe(
      (historyResult) => {
        this.parseRequestHistories(historyResult);
      }
    );

    this.workflowModel.initialize();
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

  get selectedWorkflowAction(): string {
    return (this._selectedWorkflowAction) ? this._selectedWorkflowAction.action : '';
  }

  set selectedWorkflowAction(action: string) {
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
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.frqId = this.requestModel.requestDto.frqId;
    dto.comments = this.comments;
    dto.action = this._selectedWorkflowAction.action;
    if (( dto.action === 'ap_route' || dto.action === 'route_ap') &&
       this.workflowModel.additionalApprovers && this.workflowModel.additionalApprovers.length > 0 )
    {
      dto.additionalApproverList = this.workflowModel.additionalApprovers.map( a => {
        return a.approverLdap;
      });
    }
    else if (dto.action === 'reassign') {
      dto.reassignedApproverId = this.workflowModel.pendingApprovers[0].approverLdap;
    }
    this.logger.debug('workflow dto for submission is ', dto);
    this.workflowService.submitWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('submit workflow returned okay ', result);
        this.workflowModel.initialize();
        this.requestIntegrationService.requestSubmissionEmitter.next(this.requestModel.requestDto.frqId);
      },
      (error) => {
        this.logger.error('submit workflow returned error', error);
      }
    );
  }
}
