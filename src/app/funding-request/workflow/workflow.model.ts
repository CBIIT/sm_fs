import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Injectable()
export class WorkflowModel {
 private awa: WorkflowAction[] = [];

  constructor(private logger: NGXLogger) {
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
  getWorkflowList(roleCode: string): {id: string, text: string}[] {
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
