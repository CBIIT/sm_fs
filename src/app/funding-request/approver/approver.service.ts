import { Injectable } from '@angular/core';
import { FsWorkflowControllerService } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';

@Injectable({
  providedIn: 'root'
})
export class RequestApproverService {

  constructor(public requestModel: RequestModel,
              private workflowControllerService: FsWorkflowControllerService,
              private logger: NGXLogger) { }

  checkCreateApprovers(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
    if (!this.requestModel.mainApproverCreated
        || this.requestModel.recreateMainApproverNeeded ) {
      this.createMainApprovers(resolve, reject);
    }
    // else if (this.requestModel.recreateMainApproverNeeded) {
    //   this.logger.debug('needs to recreate main approvers because of changes in funding request');
    //   this.workflowControllerService.deleteRequestApprovers(this.requestModel.requestDto.frqId).subscribe(
    //     () => {
    //       this.requestModel.mainApproverCreated = false;
    //       this.createMainApprovers(resolve, reject);
    //     },
    //     (error) => {
    //       this.logger.error('deleteRequestApprovers failed ', error);
    //       reject(error); }
    //   );
    // }
    else {
      resolve();
    }
    });
  }

  createMainApprovers(resolve: any, reject: any): void {
    const workflowDto = { frqId: this.requestModel.requestDto.frqId, requestorNpeId: this.requestModel.requestDto.requestorNpeId};
    this.workflowControllerService.createRequestApprovers(workflowDto).subscribe(
      (result) => {
        this.requestModel.captureApproverCriteria();
        this.logger.debug('Main approvers are created: ', result);
        resolve();
      },
      (error) => {
        this.logger.error('Error calling createRequestApprovers', error);
        reject(error);
      }
    );
  }
}
