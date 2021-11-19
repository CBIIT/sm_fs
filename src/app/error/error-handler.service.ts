import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { UserService } from '@nci-cbiit/i2ecui-lib';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  errorLog: Map<number, any> = new Map<number, any>();

  constructor(
    private logger: NGXLogger,
    private userService: UserService) {
  }

  registerNewError(timestamp: number, error: any): void {
    this.errorLog.set(timestamp, error);
    this.logErrorDetails(timestamp, error);
  }

  private logErrorDetails(timestamp: number, error: any): void {
    const userId: string = this.userService.currentUserValue.nihNetworkId;
    this.logger.warn(`=========== ERROR DETAILS ===========`);
    this.logger.warn(`== User/Timestamp: ${userId}/${timestamp}`);
    this.logger.warn(`== Error type: ${typeof error}`);
    this.logger.warn(`== Raw error: ${JSON.stringify(error)}`);
    this.logger.warn(`== Keys: ${Object.keys(error)}`);
    Object.keys(error).forEach(key => {
      this.logger.warn(`=== ${key} :: ${JSON.stringify(error[key])} :: ${typeof error[key]}`);
    });
    this.logger.warn(`=========== END ERROR DETAILS ===========`);
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
