import { Component, Input, OnInit } from '@angular/core';
import { FsWorkflowControllerService, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
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
export class WorkflowComponent implements OnInit {
  @Input() readonly = false;

  options: Options;

  _selectedWorkflowAction: WorkflowAction;
  comments = '';
  // workflowActions: {id: string, text: string}[];

  buttonLabel = 'Process Action';
  buttonDisabled = true;

  workflowActions: any[];
  private iSelectedValue: number;

  set selectedValue(value: number) {
    this.iSelectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    this.saveAdditionalApprover(user);
    setTimeout(() => {this.iSelectedValue = null; }, 0);
  }

  saveAdditionalApprover(user): void{
  }

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private workflowService: FsWorkflowControllerService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) { }

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

    this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => {
        this.workflowActions = this.workflowModel.getWorkflowList();
      }
    );
    this.workflowModel.initialize();

  }

  setActiveApprover(event): void {
    this.requestIntegrationService.activeApproverEmitter.next(event);
  }

  canAddApprover(): boolean {
    return false;
  }

  isApprover(): boolean {
    return this.workflowModel.isNextApproverOrDesignee;
  }

  get selectedWorkflowAction(): string {
    return (this._selectedWorkflowAction) ? this._selectedWorkflowAction.action : '';
  }

  set selectedWorkflowAction(action: string) {
    this._selectedWorkflowAction = this.workflowModel.getWorkflowAction(action);

    this.buttonLabel = this._selectedWorkflowAction.actionButtonText;
    this.buttonDisabled = this._selectedWorkflowAction.commentsRequired || this._selectedWorkflowAction.newApproverRequired;
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
      },
      (error) => {
        this.logger.error('submit workflow dto returned error', error);
      }
    );
  }
}
