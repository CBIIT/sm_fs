import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { NgxLoggerControllerService } from '@cbiit/i2ecws-lib';
import { NgxPayload } from '@cbiit/i2ecws-lib';
import { UserService } from '@cbiit/i2ecui-lib';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { HeartbeatService } from '../heartbeat/heartbeat-service';

@Injectable({
  providedIn: 'root'
})
export class CustomServerLoggingService {
  private sendLog: boolean;
  private logQueue: NgxPayload[] = [];

  constructor(
    private logger: NGXLogger,
    private logService: NgxLoggerControllerService,
    private userService: UserService,
    private router: Router,
    private heartbeatService: HeartbeatService) {
    heartbeatService.heartBeat.subscribe(next => {
      this.sendLog = next;
      if (next) {
        this.sendQueuedMessages();
      }
    });
  }

  logServer(msg: string, ...extra: any): void {
    this.logger.debug(`Logging: ${msg} :: ${extra}`);
    const logBody: NgxPayload = {
      fileName: '',
      level: 3,
      lineNumber: '',
      message: msg,
      timestamp: `${Date.now()}`,
      additional: [this.getDiagnostics(extra)],
    };
    this.post(logBody);
  }

  logServerError(msg: string, ...extra: any): void {
    this.logger.debug(`Logging: ${msg} :: ${extra}`);
    const logBody: NgxPayload = {
      fileName: '',
      level: 6,
      lineNumber: '',
      message: msg,
      timestamp: `${Date.now()}`,
      additional: [this.getDiagnostics(extra)],
    };
    this.post(logBody);
  }

  private getDiagnostics(...extra): DiagnosticPayload {
    const diagnostics: DiagnosticPayload = {
      userId: this.userService.currentUserValue.nihNetworkId,
      applicationId: 'FUNDING_SELECTIONS',
      sessionId: this.heartbeatService.sessionId,
      currentRoute: this.router.url,
      envProperties: environment,
      userProvidedData: [],
    };
    if (extra && extra.length > 0) {
      extra.forEach(x => {
        diagnostics.userProvidedData.push(x);
      });
    }

    return diagnostics;
  }

  private post(logBody: NgxPayload): void {
    if (this.sendLog) {
      this.logService.saveLogUsingPOST(logBody).subscribe(next => {
      }, error => {
        this.logger.warn(`Unable to save message to server:\n====> body: ${JSON.stringify(logBody)}\n====> error: ${JSON.stringify(error)}`);
        this.logQueue.push(logBody);
      });
    } else {
      this.logger.warn('Heartbeat indicates service is down; queing message for later send');
      this.logQueue.push(logBody);
    }
  }

  private sendQueuedMessages(): void {
    let m: NgxPayload;
    while (typeof (m = this.logQueue.shift()) !== 'undefined') {
      this.post(m);
    }
  }
}

export interface DiagnosticPayload {
  userId: string;
  applicationId: string;
  sessionId: string;
  currentRoute: string;
  envProperties: any;
  userProvidedData: any;
}


