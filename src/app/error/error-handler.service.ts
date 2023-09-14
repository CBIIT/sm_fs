import { Injectable } from '@angular/core';
import { UserService } from '@cbiit/i2ecui-lib';
import { PlanModel } from '../model/plan/plan-model';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from "ngx-logger";

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  errorLog: Map<number, any> = new Map<number, any>();

  constructor(
    private userService: UserService,
    private planModel: PlanModel,
    private requestModel: RequestModel,
    private logger: NGXLogger) {
  }

  public isTimeout(error: any): boolean {
    if (error.status === 200 && error.url?.startsWith('https://auth')) {
      return true;
    }
    return false;
  }

  registerNewError(timestamp: number, error: any): void {
    this.errorLog.set(timestamp, error);
    this.logErrorDetails(timestamp, error);
  }

  private logErrorDetails(timestamp: number, error: any): void {
    const x: any = !!this.planModel?.fundingPlanDto ? this.planModel.fundingPlanDto : this.requestModel.requestDto;
    this.logger.error('New error recorded', { timestamp, error, x });
    const userId: string = this.userService.currentUserValue.nihNetworkId;
    this.logger.debug(`=========== ERROR DETAILS ===========`);
    this.logger.debug(`== User/Timestamp: ${userId}/${timestamp}`);
    this.logger.debug(`== Error type: ${this.errorType(error)}`);
    this.logger.debug(`== Raw error: ${JSON.stringify(error)}`);
    this.logger.debug(`=========== END ERROR DETAILS ===========`);
  }

  public errorType(error: any): string {
    if (!error) {
      return '-NA-';
    }
    if (typeof error === 'string') {
      return error as string;
    }
    if (typeof error === 'object') {
      return error.constructor.name;
    }
    return typeof error;
  }

  getMessage(errorId: number): string {
    const error = this.errorLog.get(+errorId);
    if (!error) {
      return '';
    }
    return `${error.message}`;
  }

  getDetails(errorId: number): string {
    const error = this.errorLog.get(+errorId);
    if (!error) {
      return '';
    }
    return JSON.stringify(error, null, 2);
  }
}
