import { ConvertActionBindingResult } from '@angular/compiler/src/compiler_util/expression_converter';
import { Injectable } from '@angular/core';
import { FsWorkflowControllerService, FundingReqApproversDto, WorkflowTaskDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { FundingRequestIntegrationService } from '../integration/integration.service';

@Injectable()
export class WorkflowModel {

  private awa: WorkflowAction[] = [];

  _allApprovers: FundingReqApproversDto[];
  _previousApprovers: FundingReqApproversDto[];
  _pendingApprovers: FundingReqApproversDto[];
  _docApprover: FundingReqApproversDto;

  nextApprover: FundingReqApproversDto;
  addedApproverMap = new Map<number, any>();
  previousApprovers: FundingReqApproversDto[];
  // oneApprover is used when doing Approve & Route
  oneApprover: FundingReqApproversDto;
  pendingApprovers: FundingReqApproversDto[];
  additionalApprovers: FundingReqApproversDto[];

  nextApproverRoleCode = '';
  isUserNextInChain = false;
  lastInChain = false;
  hasNewApprover = false;
  isScientificApprover = false;
  isGMApprover = false;
  isFinancialApprover = false;
  isFcArc = false;
  isFcNci = false;
  approvedScientifically = false;
  approvedByGM = false;
  // 3 below properties are used for determining withdraw, hold button
  approvedByFC = false;
  isDocApprover = false;
  approvedByDoc = false;
  scientificRoleCodes = ['DOC', 'DD', 'SPL'];
  financialRoleCodes = ['FCNCI', 'FCARC'];
  approvalActions = [WorkflowActionCode.APPROVE,
    WorkflowActionCode.APPROVE_COMMENT,
    WorkflowActionCode.APPROVE_ROUTE];

  constructor(
    public requestModel: RequestModel,
    private userSessionService: AppUserSessionService,
    private workflowControllerService: FsWorkflowControllerService,
    private requestIntegrationService: FundingRequestIntegrationService,
    private logger: NGXLogger
  ) {
    this.awa = [];
    this.awa.push(new WorkflowAction(WorkflowActionCode.APPROVE, 'Approve', 'Approve', true, false, false));
    this.awa.push(new WorkflowAction(WorkflowActionCode.APPROVE_ROUTE, 'Approve and Route', 'Approve and Route', true, false, true));
    this.awa.push(new WorkflowAction(WorkflowActionCode.APPROVE_COMMENT, 'Approve with Comments', 'Approve', false, true, false, ['SPL', 'DD']));
    this.awa.push(new WorkflowAction(WorkflowActionCode.REASSIGN, 'Reassign', 'Reassign', true, false, true));
    this.awa.push(new WorkflowAction(WorkflowActionCode.REJECT, 'Reject', 'Reject', true, true, false));
    this.awa.push(new WorkflowAction(WorkflowActionCode.ROUTE_APPROVE, 'Route Before Approving', 'Route', true, false, true));
    this.awa.push(new WorkflowAction(WorkflowActionCode.RETURN, 'Return to PD for Changes', 'Return', true, true, false, ['-GM']));
    this.awa.push(new WorkflowAction(WorkflowActionCode.DEFER, 'Defer', 'Defer', false, true, false, ['SPL', 'DD']));
  }

  getWorkflowAction(action: WorkflowActionCode): WorkflowAction {
    for (const wa of this.awa) {
      if (wa.action === action) {
        return wa;
      }
    }
    this.logger.error('WorkflowAction not found for ' + action);
    return null;
  }

  // for workflow action drop down
  getWorkflowList(): { id: WorkflowActionCode, text: string }[] {
    const roleCode = this.nextApproverRoleCode;
    if (roleCode) {
      return this.awa.filter((a) => {
        if (a.allRoleCode &&
          (!a.actionRoleCodes || a.actionRoleCodes.indexOf('-' + roleCode) === -1)
        ) {
          return true;
        } else if (a.actionRoleCodes && a.actionRoleCodes.indexOf(roleCode) > -1) {
          return true;
        }
        return false;
      }).map(a => ({ id: a.action, text: a.actionName })
      );
    } else {
      return [];
    }
  }

  private isUserOneOfThem(approver: FundingReqApproversDto): boolean {
    const userId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    if (userId === approver.approverLdap) {
        return true;
    } else if (approver.designees && approver.designees.length > 0) {
        const designees = approver.designees.map(d => d.delegateTo);
        if (designees.indexOf(userId) > -1) {
          return true;
        }
    }

    return false;
  }

  initialize(): void {
    this.nextApproverRoleCode = null;
    this.isUserNextInChain = false;
    this.lastInChain = false;
    this.isScientificApprover = false;
    this.approvedScientifically = false;
    this.isGMApprover = false;
    this.approvedByGM = false;
    this.approvedByFC = false;
    this.approvedByDoc = false;
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
      return approver.responseDate === null;
    });

    this._previousApprovers = result.filter((approver) => {
      return approver.responseDate !== null;
    });

    const docList = result.filter((approver) => {
      return approver.roleCode === 'DOC';
    });

    this._docApprover = docList && docList.length > 0 ? docList[0] : {approverFirstName: 'Unknown'};
    this.isDocApprover = this.isUserOneOfThem(this._docApprover);

    this.nextApprover = this._pendingApprovers && this._pendingApprovers.length > 0 ? this._pendingApprovers[0] : null;
    if (this.nextApprover) {
      this.isUserNextInChain = this.isUserOneOfThem(this.nextApprover);

      if (this.isUserNextInChain) {
        this.nextApproverRoleCode = this.nextApprover.roleCode ? this.nextApprover.roleCode : 'ADDITIONAL';
        if (this._pendingApprovers.length === 1) {
          this.lastInChain = true;
        }

        if (this.scientificRoleCodes.indexOf(this.nextApproverRoleCode) > -1) {
          this.isScientificApprover = true;
        }

        if (this.financialRoleCodes.indexOf(this.nextApproverRoleCode) > -1) {
          this.isFinancialApprover = true;
          if (this.nextApproverRoleCode === 'FCARC') {
            this.isFcArc = true;
          } else if (this.nextApproverRoleCode === 'FCNCI') {
            this.isFcNci = true;
          }
        }

        if (this.nextApproverRoleCode === 'GM') {
          this.isGMApprover = true;
        }
      }

    }

    if (this._previousApprovers && this._previousApprovers.length > 0) {
      for (const a of this._previousApprovers) {
        if (this.scientificRoleCodes.indexOf(a.roleCode) > -1 && a.responseCode === 'Y') {
          this.approvedScientifically = true;
        }
        if (a.roleCode === 'GM' && a.responseCode === 'Y') {
          this.approvedByGM = true;
        }
        if (this.financialRoleCodes.includes(a.roleCode) && a.responseCode === 'Y') {
          this.approvedByFC = true;
        }
        if (a.roleCode === 'DOC' && a.responseCode === 'Y') {
          this.approvedByDoc = true;
        }
        if (this.approvedByGM && this.approvedScientifically) {
          break;
        }
      }
    }

    this.resetApproverLists();
    this.requestIntegrationService.approverListChangeEmitter.next();
    this.logger.debug('WorkflowModel after initialization', this);
  }

  resetApproverLists(): void {
    this.pendingApprovers = this._pendingApprovers.slice();
    this.previousApprovers = this._previousApprovers;
    this.oneApprover = null;
    this.additionalApprovers = null;
    this.addedApproverMap.clear();
    this.hasNewApprover = false;
    this._allApprovers.forEach((approver) => {
      this.addedApproverMap.set(approver.approverNpnId, true);
    });

  }

  prepareApproverListsForView(action: WorkflowActionCode): void {
    this.resetApproverLists();
    if (action === WorkflowActionCode.APPROVE_ROUTE) {
      if (this.pendingApprovers.length > 0) {
        this.oneApprover = this.pendingApprovers.splice(0, 1)[0];
      }
    }
    this.requestIntegrationService.approverListChangeEmitter.next();
  }

  addAdditionalApprover(user: any, action: WorkflowActionCode): void {
    if (action === WorkflowActionCode.REASSIGN) {
      const approver: FundingReqApproversDto = JSON.parse(JSON.stringify(this.pendingApprovers[0]));
      approver.approverNpnId = user.id;
      approver.approverLdap = user.nciLdapCn;
      approver.approverFullName = user.fullName;
      approver.approverEmailAddress = user.emailAddress;
      approver.designees = null;
      this.pendingApprovers[0] = approver;
      this.addedApproverMap.set(user.id, true);
      this.hasNewApprover = true;
      this.requestIntegrationService.approverListChangeEmitter.next();
    } else {// if ( action === WorkflowActionCode.APPROVE_ROUTE || action === WorkflowActionCode.ROUTE_APPROVE) {
      if (!this.additionalApprovers) {
        this.additionalApprovers = [];
      }
      const approver: FundingReqApproversDto = {};
      approver.approverNpnId = user.id;
      approver.approverLdap = user.nciLdapCn;
      approver.approverFullName = user.fullName;
      approver.approverEmailAddress = user.emailAddress;
      approver.assignerFullName = this.userSessionService.getLoggedOnUser().fullName;
      this.additionalApprovers.push(approver);
      this.addedApproverMap.set(user.id, true);
      this.hasNewApprover = true;
      this.reorderApprovers();
      this.requestIntegrationService.approverListChangeEmitter.next();
    }
  }

  deleteAdditionalApprover(index: number): void {
    if (this.additionalApprovers) {
      this.addedApproverMap.delete(this.additionalApprovers.splice(index, 1)[0].approverNpnId);
    }
    this.hasNewApprover = (!this.additionalApprovers || this.additionalApprovers.length === 0) ? false : true;
    this.reorderApprovers();
    this.requestIntegrationService.approverListChangeEmitter.next();
  }

  reorderApprovers(): void {
    let orderNum = (this.previousApprovers) ? this.previousApprovers.length : 0;
    if (this.oneApprover) {
      orderNum++;
    }
    for (const a of this.additionalApprovers) {
      orderNum++;
      a.orderNum = orderNum;
    }
    for (const a of this.pendingApprovers) {
      orderNum++;
      a.orderNum = orderNum;
    }
  }

  // this is used by SubmitRequest method to show the next approver in the submission message.
  getNextApproverInChain(): FundingReqApproversDto {
    if (this.oneApprover) {
      return this.oneApprover;
    } else if (this.additionalApprovers && this.additionalApprovers.length > 0) {
      return this.additionalApprovers[0];
    } else if (this.pendingApprovers && this.pendingApprovers.length > 0) {
      return this.pendingApprovers[0];
    }

    return {};
  }

  isApprovalAction(action: WorkflowActionCode): boolean {
    return this.approvalActions.indexOf(action) > -1;
  }

  getDocApprover(): FundingReqApproversDto {
    return this._docApprover;
  }
}

export class WorkflowAction {
  action: WorkflowActionCode;
  actionName: string;
  allRoleCode: boolean;
  actionRoleCodes: string[];
  actionButtonText: string;
  commentsRequired: boolean;
  newApproverRequired: boolean;

  constructor(action: WorkflowActionCode, actionName: string, actionButtonText: string, allRoles: boolean,
              commentsRequired: boolean, newApproverRequired: boolean, roles?: string[]) {
    this.action = action;
    this.actionName = actionName;
    this.actionButtonText = actionButtonText;
    this.allRoleCode = allRoles;
    this.commentsRequired = commentsRequired;
    this.newApproverRequired = newApproverRequired;
    this.actionRoleCodes = roles;
  }
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  WITHDRAWN = 'WITHDRAWN',
  APPROVED = 'APPROVED',
  ON_HOLD = 'ON HOLD',
  REJECTED = 'REJECTED',
  RFC = 'RFC',
  RELEASED = 'RELEASED',
  COMPLETED = 'COMPLETED',
  DELEGATED = 'DELEGATED',
  ROUTED = 'ROUTED',
  REASSIGNED = 'REASSIGNED',
  AWC = 'AWC',
  DEFER = 'DEFER',
  CANCELLED = 'CANCELLED',
}

export const ApprovingStatuses: string[] = [
  RequestStatus.SUBMITTED,
  RequestStatus.REASSIGNED,
  RequestStatus.APPROVED,
  RequestStatus.AWC,
  RequestStatus.ROUTED,
  RequestStatus.DELEGATED,
  RequestStatus.RELEASED
];

export enum WorkflowActionCode {
  APPROVE = 'APPROVE',
  APPROVE_ROUTE = 'APPROVE_ROUTE',
  APPROVE_COMMENT = 'APPROVE_COMMENT',
  REASSIGN = 'REASSIGN',
  REJECT = 'REJECT',
  ROUTE_APPROVE = 'ROUTE_APPROVE',
  RETURN = 'RETURN',
  DEFER = 'DEFER',
  SUBMIT = 'SUBMIT',
  WITHDRAW = 'WITHDRAW',
  HOLD = 'HOLD',
  SUBMIT_APPROVE = 'SUBMIT_APPROVE',
  RELEASE = 'RELEASE'
}

