import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FsWorkflowControllerService, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { Options } from 'select2';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { ApproverListComponent } from './approver-list/approver-list.component';
import { WorkflowAction, WorkflowModel } from './workflow.model';

const approverMap = new Map<number, any>();
const addedApproverMap = new Map<number, any>();

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css'],
  providers: [WorkflowModel]
})
export class WorkflowComponent implements OnInit, OnDestroy {
  @Input() readonly = false;
  @ViewChild(ApproverListComponent) approverListComponent: ApproverListComponent;

  approverChangeSubscription: Subscription;

  options: Options;
  _selectedWorkflowAction: WorkflowAction;
  comments = '';
  buttonLabel = 'Process Action';
  buttonDisabled = true;
  workflowActions: any[];

  showAddApprover = false;

  private iSelectedValue: number;

  set selectedValue(value: number) {
    this.iSelectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    this.addAdditionalApprover(user);
    setTimeout(() => {this.iSelectedValue = null; }, 0);
  }

  get selectedValue(): number {
    return this.iSelectedValue;
  }

  addAdditionalApprover(user: any): void{
    this.approverListComponent.addAdditionalApprover(user);
  }

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private workflowService: FsWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) { }

  ngOnDestroy(): void {
    if (this.approverChangeSubscription) {
      this.approverChangeSubscription.unsubscribe();
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

    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => {
        this.workflowActions = this.workflowModel.getWorkflowList();
      }
    );
    this.workflowModel.initialize();

  }

  setActiveApprover(event): void {
    this.requestIntegrationService.activeApproverEmitter.next(event);
  }

  isApprover(): boolean {
    return this.workflowModel.isUserNextInChain;
  }

  get selectedWorkflowAction(): string {
    return (this._selectedWorkflowAction) ? this._selectedWorkflowAction.action : '';
  }

  set selectedWorkflowAction(action: string) {
    this._selectedWorkflowAction = this.workflowModel.getWorkflowAction(action);
    if (!this._selectedWorkflowAction) {
      return;
    }

    this.buttonLabel = this._selectedWorkflowAction.actionButtonText;
    this.buttonDisabled = this._selectedWorkflowAction.commentsRequired || this._selectedWorkflowAction.newApproverRequired;

    if (this._selectedWorkflowAction.newApproverRequired) {
      this.showAddApprover = true;
      this.approverListComponent.separateApproverLists(action);
    }
    else {
      this.approverListComponent.resetApproverList();
      this.showAddApprover = false;
    }
  }

  submitWorkflow(): void {
    const dto: WorkflowTaskDto = {};
    dto.actionUserId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    dto.frqId = this.requestModel.requestDto.frqId;
    dto.comments = this.comments;
    dto.action = this._selectedWorkflowAction.action;
    this.logger.debug('workflow dto for submission is ', dto);
    this.workflowService.submitWorkflowUsingPOST(dto).subscribe(
      (result) => {
        this.logger.debug('submit workflow returned okay ', result);
        this.workflowModel.initialize();
        this.requestIntegrationService.requestSubmissionEmitter.next(this.requestModel.requestDto.frqId);
      },
      (error) => {
        this.logger.error('submit workflow dto returned error', error);
      }
    );
  }
}
