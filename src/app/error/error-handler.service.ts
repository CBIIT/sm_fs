import { Injectable } from '@angular/core';
import { UserService } from '@cbiit/i2ecui-lib';
import { CustomServerLoggingService } from '../logging/custom-server-logging-service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  errorLog: Map<number, any> = new Map<number, any>();

  constructor(
    private userService: UserService,
    private logger: CustomServerLoggingService) {
  }

  registerNewError(timestamp: number, error: any): void {
    this.errorLog.set(timestamp, error);
    this.logErrorDetails(timestamp, error);
  }

  private logErrorDetails(timestamp: number, error: any): void {
    this.logger.logErrorWithContext(``, { timestamp, error });
    const userId: string = this.userService.currentUserValue.nihNetworkId;
    this.logger.debug(`=========== ERROR DETAILS ===========`);
    this.logger.debug(`== User/Timestamp: ${userId}/${timestamp}`);
    this.logger.debug(`== Error type: ${typeof error}`);
    this.logger.debug(`== Raw error: ${JSON.stringify(error)}`);
    this.logger.debug(`== Keys: ${Object.keys(error)}`);
    Object.keys(error).forEach(key => {
      this.logger.debug(`=== ${key} :: ${JSON.stringify(error[key])} :: ${typeof error[key]}`);
    });
    this.logger.debug(`=========== END ERROR DETAILS ===========`);
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
