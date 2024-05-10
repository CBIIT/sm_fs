import { Component, Input, OnInit } from '@angular/core';
import { FundingReqApproversDto, NciPfrGrantQueryDto } from '@cbiit/i2efsws-lib';
import { RequestModel } from 'src/app/model/request/request-model';
import { PlanModel } from '../../../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { AppUserSessionService } from '../../../../service/app-user-session.service';

// this is to work around the name returned by stored procedure contains text listed in suffixchecks.
@Component({
  selector: 'app-approver-name-renderer',
  templateUrl: './approver-name-renderer.component.html',
  styleUrls: ['./approver-name-renderer.component.css']
})
export class ApproverNameRendererComponent implements OnInit {
  @Input() approver: FundingReqApproversDto;
  @Input() currentApprover = false;

  private readonly PENDING_APPROVAL_CODES=["APPROVED","AWC","DEFER","REASSIGNED","RELEASED","ROUTED","SUBMITTED"]
  private readonly FINANCIAL_ROLES = ['FA', 'FCNCI'];

  pendingApproval: boolean;
  name: string;
  suffix: string;
  private suffixChecks = [' on behalf of NCI Director', ' (Designee for NCI Director)', ', Executive Secretary'];
  financialApprover: boolean;

  userIsFinancialAnalyst: boolean;

  constructor(
    private userSessionService: AppUserSessionService,
    private requestModel: RequestModel,
    private planModel: PlanModel,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.userIsFinancialAnalyst = this.userSessionService.getLoggedOnUser().roles.map(role => role.roleCode).some(c => this.FINANCIAL_ROLES.includes(c));
    this.pendingApproval = this.PENDING_APPROVAL_CODES.includes(this.requestModel?.requestDto?.requestStatusCode) || this.PENDING_APPROVAL_CODES.includes(this.planModel?.fundingPlanDto?.planStatusCode);
    this.financialApprover = this.FINANCIAL_ROLES.includes(this.approver.roleCode);
    this.name = this.approver.approverFullName;

    if (this.name) {
      for (const suffix of this.suffixChecks) {
        if (this.name.includes(suffix)) {
          this.name = this.name.substr(0, this.name.length - suffix.length);
          this.suffix = suffix;
          break;
        }
      }
    }
  }

}
