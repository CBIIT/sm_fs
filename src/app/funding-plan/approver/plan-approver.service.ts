import { Injectable } from '@angular/core';
import { FsPlanWorkflowControllerService } from '@cbiit/i2ecws-lib';
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
    if (!this.planModel.mainApproversCreated) {
      this.createMainApprovers(resolve, reject);
    }
    else if (this.planModel.isMainApproversRegenNeeded()) {
      this.logger.debug('needs to recreate main approvers because of changes in funding request');
      this.planService.deletePlanApproversUsingGET(this.planModel.fundingPlanDto.fprId).subscribe(
        () => {
          this.planModel.mainApproversCreated = false;
          this.createMainApprovers(resolve, reject);
        },
        (error) => {
          this.logger.error('deleteRequestApprovers failed ', error);
          reject(error); }
      );
    }
    else {
      resolve();
    }
    });
  }

  private createMainApprovers(resolve: any, reject: any): void {
    const workflowDto = { fprId: this.planModel.fundingPlanDto.fprId, requestorNpeId: this.planModel.fundingPlanDto.requestorNpeId};
    this.planService.createPlanApproversUsingPOST(workflowDto).subscribe(
      (result) => {
        this.planModel.markMainApproversCreated();
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
