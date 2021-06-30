import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Options } from 'select2';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FsWorkflowControllerService, FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
import { WorkflowModel } from '../workflow.model';
import { FundingRequestIntegrationService } from '../../integration/integration.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-approver-list',
  templateUrl: './approver-list.component.html',
  styleUrls: ['./approver-list.component.css']
})

export class ApproverListComponent implements OnInit, OnDestroy {
  @Input() readonly = false;
//  @Output() nextApprover = new EventEmitter<FundingReqApproversDto>();

  options: Options;

  previousApprovers: FundingReqApproversDto[];
  pendingApprovers: FundingReqApproversDto[];
  additionalApprovers: FundingReqApproversDto[];
  oneApprover: FundingReqApproversDto;

  approverChangeSubscription: Subscription;

  constructor(public requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private requestIntegrationService: FundingRequestIntegrationService,
              private changeDetection: ChangeDetectorRef,
              private logger: NGXLogger) {
  }
  ngOnDestroy(): void {
    if (this.approverChangeSubscription) {
      this.approverChangeSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.approverChangeSubscription = this.requestIntegrationService.approverListChangeEmitter.subscribe(
      () => {

        this.pendingApprovers = this.workflowModel.pendingApprovers;
        this.previousApprovers = this.workflowModel.previousApprovers;
        this.oneApprover = this.workflowModel.oneApprover;
        this.additionalApprovers = this.workflowModel.additionalApprovers;
        this.logger.debug('approver change subscription is run, pending approvers are ', this.pendingApprovers);
        this.changeDetection.detectChanges();
      }
    );

  }

// resetApproverList(): void {
//   this.pendingApprovers = this.workflowModel.pendingApprovers;
//   this.oneApprover = null;
// }

// separateApproverLists(action: string): void {
//   if (action === 'ap_route') {
//     this.pendingApprovers = this.workflowModel.pendingApprovers.slice();
//     if (this.pendingApprovers.length > 0) {
//       this.oneApprover = this.pendingApprovers[0];
//       this.pendingApprovers.splice(0, 1);
//     }
//     this.logger.debug('separateApproverList oneApprover=', this.oneApprover);
//     this.logger.debug('separateApproverList nextApprove=', this.pendingApprovers);
//   }
// }

// addAdditionalApprover(user: any): void {
//   if (!this.additionalApprovers) {
//     this.additionalApprovers = [];
//   }
//   const approver: FundingReqApproversDto = {};
//   approver.approverLdap = user.nciLdapCn;
//   approver.approverFullName = user.fullName;
//   this.additionalApprovers.push(approver);
// }

  dropped(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    moveItemInArray(this.additionalApprovers, event.previousIndex, event.currentIndex);
  }

  deleteAdditionalApprover(index: number): void {
    this.workflowModel.deleteAdditionalApprover(index);
  }

}
