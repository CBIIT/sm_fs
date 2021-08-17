import { Injectable } from '@angular/core';
import { FsPlanWorkflowControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from 'src/app/model/plan/plan-model';

@Injectable({
  providedIn: 'root'
})
export class PlanApproverService {

  constructor(public planModel: PlanModel,
              private planService: FsPlanWorkflowControllerService,
              private logger: NGXLogger) { }

  checkCreateApprovers(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
    // if (!this.planModel.mainApproverCreated) {
    //   this.createMainApprovers(resolve, reject);
    // }
    // else if (this.planModel.recreateMainApproverNeeded) {
    //   this.logger.debug('needs to recreate main approvers because of changes in funding request');
    //   this.planService.deletePlanApproversUsingGET(this.planModel.minimumScore).subscribe(
    //     () => {
    //       this.planModel.mainApproverCreated = false;
    //       this.createMainApprovers(resolve, reject);
    //     },
    //     (error) => {
    //       this.logger.error('deleteRequestApprovers failed ', error);
    //       reject(error); }
    //   );
    // }
    // else {
    //   resolve();
    // }
    });
  }

  createMainApprovers(resolve: any, reject: any): void {
    // TO-DO, need to used the real fprId and requestorNpeId in the planModel.
    const workflowDto = { fprId: this.planModel.minimumScore, requestorNpeId: this.planModel.minimumScore};
    this.planService.createPlanApproversUsingPOST(workflowDto).subscribe(
      (result) => {
////        this.planModel.captureApproverCriteria();
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
