import { Injectable } from '@angular/core';
import { FsWorkflowControllerService, FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';

@Injectable()
export class WorkflowModel {
 private awa: WorkflowAction[] = [];

 allApprovers: FundingReqApproversDto[];
 previousApprovers: FundingReqApproversDto[];
 pendingApprovers: FundingReqApproversDto[];
 oneApprover: FundingReqApproversDto;

 nextApprover: FundingReqApproversDto;

 nextApproverRoleCode = '';
 isNextApproverOrDesignee = false;

  constructor(
    public requestModel: RequestModel,
    private userSessionService: AppUserSessionService,
    private workflowControllerService: FsWorkflowControllerService,
    private requestIntegrationService: FundingRequestIntegrationService,
    private logger: NGXLogger
    ) {
    this.awa = [];
    this.awa.push(new WorkflowAction('approve', 'Approve', 'Approve', true, false, false));
    this.awa.push(new WorkflowAction('ap_route', 'Approve and Route', 'Approve and Route', true, false, true));
    this.awa.push(new WorkflowAction('ap_comment', 'Approve with Comments', 'Approve', false, true, false, ['FCSPL', 'FCNCIDIR']));
    this.awa.push(new WorkflowAction('reassign', 'Reassign', 'Reassign', true, false, true));
    this.awa.push(new WorkflowAction('reject', 'Reject', 'Reject', true, true, false));
    this.awa.push(new WorkflowAction('route_ap', 'Route Before Approving', 'Route', true, false, true));
    this.awa.push(new WorkflowAction('return', 'Return to PD for Changes', 'Return', true, true, true, ['-GM']));
    this.awa.push(new WorkflowAction('defer', 'Defer', 'Defer', false, true, false, ['FCSPL', 'FCNCIDIR']));
  }

  getWorkflowAction(action: string): WorkflowAction {
    for (const wa of this.awa) {
      if (wa.action === action) {
        return wa;
      }
    }
    this.logger.error('WorkflowAction not found for ' + action);
    return null;
  }

  // for workflow action drop down
  getWorkflowList(): {id: string, text: string}[] {
    const roleCode = this.nextApproverRoleCode;
    if (roleCode) {
      return this.awa.filter((a) => {
        if (a.allRoleCode &&
            (!a.actionRoleCodes || a.actionRoleCodes.indexOf('-' + roleCode) === -1)
          ) {
          return true;
        }
        else if ( a.actionRoleCodes && a.actionRoleCodes.indexOf(roleCode) > -1 ) {
          return true;
        }
        return false;
      }).map( a => ({id : a.action, text : a.actionName})
      );
    }
    else {
      return [];
    }
  }

  initialize(): void {
    this.workflowControllerService.getRequestApproversUsingGET(this.requestModel.requestDto.frqId).subscribe(
      (result) => {
        this.processApproversResult(result);
        this.requestModel.captureApproverCriteria();
        this.requestIntegrationService.approverListChangeEmitter.next();
      },
      (error) => {
        this.logger.error('Error calling createRequestApprovers', error);
      }
    );
  }

  processApproversResult(result: FundingReqApproversDto[]): void {
    // addedApproverMap.clear();
    // result.forEach((approver) => {
    //   addedApproverMap.set(approver.approverNpnId, true);
    // });

    this.allApprovers = result;

    this.pendingApprovers = result.filter((approver) => {
      return approver.responseDate === null && approver.roleCode !== null;
    });

    this.previousApprovers = result.filter((approver) => {
      return approver.responseDate !== null;
    });

    this.nextApprover = this.pendingApprovers && this.pendingApprovers.length > 0 ? this.pendingApprovers[0] : null;
    if ( this.nextApprover ) {
      this.nextApproverRoleCode = this.nextApprover.roleCode;

      const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
      this.isNextApproverOrDesignee = false;
      if (userId === this.nextApprover.approverLdap) {
        this.isNextApproverOrDesignee = true;
      }
      else if (this.nextApprover.designees && this.nextApprover.designees.length > 0){
        const designees = this.nextApprover.designees.map( d => d.delegateTo);
        if (designees.indexOf(userId) > -1) {
          this.isNextApproverOrDesignee = true;
        }
      }
    }
    else {
      this.nextApproverRoleCode = null;
      this.isNextApproverOrDesignee = false;
    }
  }
}

export class WorkflowAction {
  action: string;
  actionName: string;
  allRoleCode: boolean;
  actionRoleCodes: string[];
  actionButtonText: string;
  commentsRequired: boolean;
  newApproverRequired: boolean;

  constructor(action: string, actionName: string, actionButtonText: string, allRoles: boolean,
              commentsRequired: boolean, newApproverRequired: boolean, roles?: string[])
  {
    this.action = action;
    this.actionName = actionName;
    this.actionButtonText = actionButtonText;
    this.allRoleCode = allRoles;
    this.commentsRequired = commentsRequired;
    this.newApproverRequired = newApproverRequired;
    this.actionRoleCodes = roles;
  }
}
