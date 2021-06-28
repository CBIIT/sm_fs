import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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
              private workflowControllerService: FsWorkflowControllerService,
              private requestIntegrationService: FundingRequestIntegrationService,
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
      }
    );

  }

//   createMainApprovers(): void {
//     const workflowDto = { frqId: this.requestModel.requestDto.frqId, requestorNpeId: this.requestModel.requestDto.requestorNpeId};
//     this.workflowControllerService.createRequestApproversUsingPOST(workflowDto).subscribe(
//       (result) => {
//         this.requestModel.mainApproverCreated = true;
//         this.requestModel.captureApproverCriteria();
// //        this.processApproversResult(result);
//         this.logger.debug('Main approvers are created: ', result);
//       },
//       (error) => {
//         this.logger.error('Error calling createRequestApprovers', error);
//       }
//     );
//   }

processApproversResult(result: FundingReqApproversDto[]): void {

}

  dropped(event: CdkDragDrop<any[]>): void {
   // moveItemInArray(this.requestApprovers, event.previousIndex, event.currentIndex);
   if (event.previousIndex === event.currentIndex) {
     return;
   }
   this.workflowControllerService.moveAdditionalApproverUsingPOST(
     event.currentIndex + 1, this.requestModel.requestDto.frqId, event.previousIndex + 1).subscribe(
      (result) => { this.processApproversResult(result); },
      (error) => {
        this.logger.error('Error moveAdditionalApproverUsingPOST ', error);
      }
     );
  }

//   saveAdditionalApprover(user: any): void {
//     this.workflowControllerService.saveAdditionalApproverUsingPOST(
//       this.userSessionService.getLoggedOnUser().nihNetworkId,
//       this.requestModel.requestDto.frqId,
//       user.nciLdapCn).subscribe(
//       (result) => { this.processApproversResult(result); },
//       (error) => {
//         this.logger.error('Error saveAdditionalApproverUsingPOST ', error);
//       }
//     );
//   }

//   deleteAdditionalApprover(fraId: number): void {
//     this.workflowControllerService.deleteAdditionalApproverUsingPOST(fraId, this.requestModel.requestDto.frqId).subscribe(
//       (result) => { this.processApproversResult(result); },
//       (error) => {
//         this.logger.error('Error saveAdditionalApproverUsingPOST ', error);
//       }
//     );
//   }

}
