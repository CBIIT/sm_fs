import { Injectable } from '@angular/core';
import { FsWorkflowControllerService, FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';

@Injectable()
export class WorkflowModel {

 private awa: WorkflowAction[] = [];

 _allApprovers: FundingReqApproversDto[];
 _previousApprovers: FundingReqApproversDto[];
 _pendingApprovers: FundingReqApproversDto[];

 nextApprover: FundingReqApproversDto;
 addedApproverMap = new Map<number, any>();
 previousApprovers: FundingReqApproversDto[];
 oneApprover: FundingReqApproversDto;
 pendingApprovers: FundingReqApproversDto[];
 additionalApprovers: FundingReqApproversDto[];


 nextApproverRoleCode = '';
 isUserNextInChain = false;

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
    this.awa.push(new WorkflowAction('return', 'Return to PD for Changes', 'Return', true, true, false, ['-GM']));
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
        this.requestIntegrationService.approverInitializationEmitter.next();
      },
      (error) => {
        this.logger.error('Error calling createRequestApprovers', error);
      }
    );
  }

  processApproversResult(result: FundingReqApproversDto[]): void {
    this._allApprovers = result;

    this._pendingApprovers = result.filter((approver) => {
      return approver.responseDate === null && approver.roleCode !== null;
    });

    this._previousApprovers = result.filter((approver) => {
      return approver.responseDate !== null;
    });

    this.nextApprover = this._pendingApprovers && this._pendingApprovers.length > 0 ? this._pendingApprovers[0] : null;
    if ( this.nextApprover ) {
      this.nextApproverRoleCode = this.nextApprover.roleCode;

      const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
      this.isUserNextInChain = false;
      if (userId === this.nextApprover.approverLdap) {
        this.isUserNextInChain = true;
      }
      else if (this.nextApprover.designees && this.nextApprover.designees.length > 0){
        const designees = this.nextApprover.designees.map( d => d.delegateTo);
        if (designees.indexOf(userId) > -1) {
          this.isUserNextInChain = true;
        }
      }
    }
    else {
      this.nextApproverRoleCode = null;
      this.isUserNextInChain = false;
    }

    this.resetApproverLists();
    this.requestIntegrationService.approverListChangeEmitter.next();
  }

  resetApproverLists(): void {
    this.pendingApprovers = this._pendingApprovers.slice();
    this.previousApprovers = this._previousApprovers;
    this.oneApprover = null;
    this.additionalApprovers = null;
    this.addedApproverMap.clear();
    this._allApprovers.forEach((approver) => {
      this.addedApproverMap.set(approver.approverNpnId, true);
    });

  }


  prepareApproverListsForView(action: string): void {
    this.resetApproverLists();
    if (action === 'ap_route') {
      if (this.pendingApprovers.length > 0) {
        this.oneApprover = this.pendingApprovers.splice(0, 1)[0];
      }
    }
    this.requestIntegrationService.approverListChangeEmitter.next();
  }

  addAdditionalApprover(user: any, action: string): void {

    if (action === 'reassign') {
      const approver: FundingReqApproversDto =  JSON.parse(JSON.stringify(this.pendingApprovers[0]));
      approver.approverNpnId = user.id;
      approver.approverLdap = user.nciLdapCn;
      approver.approverFullName = user.fullName;
      approver.approverEmailAddress = user.emailAddress;
      this.pendingApprovers[0] = approver;
      this.addedApproverMap.set(user.id, true);
      this.logger.debug('pending approvers ', this.pendingApprovers);
      this.logger.debug('_pending approvers ', this._pendingApprovers);
      this.requestIntegrationService.approverListChangeEmitter.next();
    }
    else if ( action === 'ap_route' || action === 'route_ap') {
      if (!this.additionalApprovers) {
        this.additionalApprovers = [];
      }
      const approver: FundingReqApproversDto = {};
      approver.approverNpnId = user.id;
      approver.approverLdap = user.nciLdapCn;
      approver.approverFullName = user.fullName;
      approver.approverEmailAddress = user.emailAddress;
      this.additionalApprovers.push(approver);
      this.addedApproverMap.set(user.id, true);
      this.requestIntegrationService.approverListChangeEmitter.next();
    }
  }

  deleteAdditionalApprover(index: number): void {
    if (this.additionalApprovers) {
      this.addedApproverMap.delete(this.additionalApprovers.splice(index, 1)[0].approverNpnId);
    }
    this.requestIntegrationService.approverListChangeEmitter.next();
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
