import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Options } from 'select2';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';
import { WorkflowModel } from '../workflow.model';
import { FundingRequestIntegrationService } from '../../integration/integration.service';
import { Subscription } from 'rxjs';
import { FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-approver-list',
  templateUrl: './approver-list.component.html',
  styleUrls: ['./approver-list.component.css']
})

export class ApproverListComponent implements OnInit, OnDestroy {
  @Input() readonly = false;

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

  dropped(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    moveItemInArray(this.additionalApprovers, event.previousIndex, event.currentIndex);
    this.workflowModel.reorderApprovers();
  }

  deleteAdditionalApprover(index: number): void {
    this.workflowModel.deleteAdditionalApprover(index);
  }

  approverRoleName(value: FundingReqApproversDto): string {
    return value.roleName ? value.roleName : 'Additional Approver (Added by ' + value.assignerFullName + ')';
  }

}
