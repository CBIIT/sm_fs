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
  private sendLog = false;
  private retryQueue: NgxPayload[] = [];
  private userQueue: NgxPayload[] = [];
  private MAX_QUEUE = 100;

  constructor(
    private logger: NGXLogger,
    private logService: NgxLoggerControllerService,
    private userService: UserService,
    private router: Router,
    private heartbeatService: HeartbeatService) {
    heartbeatService.heartBeat.subscribe(next => {
      this.sendLog = next;
      if (next) {
        this.sendQueuedMessages(this.retryQueue);
      }
    });
  }

  queueMessage(msg: any, ...extra: any): void {
    const logBody: NgxPayload = {
      fileName: '',
      level: 3,
      lineNumber: '',
      message: msg,
      timestamp: `${Date.now()}`,
      additional: [this.getDiagnostics(extra)],
    };
    this.pushQueueMessage(this.userQueue, logBody);
  }

  pushQueueMessage(queue: NgxPayload[], body: NgxPayload): void {
    if (queue.length > this.MAX_QUEUE) {
      queue.shift();
    }
    queue.push(body);
  }

  clearUserQueue(): void {
    this.userQueue = [];
  }

  postUserQueue(): void {
    this.sendQueuedMessages(this.userQueue);
  }

  logServer(msg: any, ...extra: any[]): void {
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

  logServerError(msg: any, ...extra: any[]): void {
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

  private getDiagnostics(...extra: any[]): DiagnosticPayload {
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
      this.logService.saveLogUsingPOST(logBody).subscribe(() => {
      }, error => {
        this.logger.warn(`Error saving message to server: ${JSON.stringify(error)}`);
        this.pushQueueMessage(this.retryQueue, logBody);
      });
    } else {
      this.logger.warn('Heartbeat indicates service is down; queing message for later send');
      this.pushQueueMessage(this.retryQueue, logBody);
    }
  }

  private sendQueuedMessages(queue: NgxPayload[]): void {
    let m: NgxPayload;
    while (typeof (m = queue.shift()) !== 'undefined') {
      this.post(m);
    }
  }

  /* proxy methods for NGXLogger */
  trace(message: any, ...additional: any[]): void {
    this.logger.trace(message, additional);
  }

  debug(message: any, ...additional: any[]): void {
    this.logger.debug(message, additional);
  }

  info(message: any, ...additional: any[]): void {
    this.logger.info(message, additional);
  }

  log(message: any, ...additional: any[]): void {
    this.logger.log(message, additional);
  }

  warn(message: any, ...additional: any[]): void {
    this.logger.warn(message, additional);
  }

  error(message: any, ...additional: any[]): void {
    this.logger.error(message, additional);
  }

  fatal(message: any, ...additional: any[]): void {
    this.logger.fatal(message, additional);
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


