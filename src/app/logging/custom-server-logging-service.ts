import { Injectable } from '@angular/core';
import { NGXLogger, NgxLoggerLevel } from 'ngx-logger';
import { NgxLoggerControllerService, NgxPayload } from '@cbiit/i2ecws-lib';
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

  public userQueueLevel: NgxLoggerLevel.INFO;

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

  private queueMessage(logBody: NgxPayload): void {
    this.pushQueueMessage(this.userQueue, logBody);
  }

  private pushQueueMessage(queue: NgxPayload[], body: NgxPayload): void {
    if (queue.length > this.MAX_QUEUE) {
      queue.shift();
    }
    queue.push(body);
  }

  private clearUserQueue(): void {
    this.userQueue = [];
  }

  private postUserQueue(): void {
    this.sendQueuedMessages(this.userQueue);
  }

  logServer(msg: any, ...extra: any[]): void {
    const logBody: NgxPayload = this.buildPayload(NgxLoggerLevel.INFO, msg, extra);
    this.post(logBody);
  }

  logServerError(msg: any, ...extra: any[]): void {
    const logBody: NgxPayload = this.buildPayload(NgxLoggerLevel.ERROR, msg, [...extra, this.userQueue]);
    this.post(logBody);
  }

  private buildPayload(level: NgxLoggerLevel, msg: any, ...extra: any[]): NgxPayload {
    const payload: NgxPayload = {
      fileName: '',
      level: +level,
      lineNumber: '',
      message: msg,
      timestamp: `${Date.now()}`,
      additional: [this.getDiagnostics(extra)],
    };

    return payload;
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
    this.queueUserMessage(NgxLoggerLevel.TRACE, message, additional);
  }

  debug(message: any, ...additional: any[]): void {
    this.logger.debug(message, additional);
    this.queueUserMessage(NgxLoggerLevel.DEBUG, message, additional);
  }

  info(message: any, ...additional: any[]): void {
    this.logServer(message, additional);
    this.logger.info(message, additional);
    this.queueUserMessage(NgxLoggerLevel.INFO, message, additional);
  }

  log(message: any, ...additional: any[]): void {
    this.logger.log(message, additional);
    this.queueUserMessage(NgxLoggerLevel.LOG, message, additional);
  }

  warn(message: any, ...additional: any[]): void {
    this.logger.warn(message, additional);
    this.queueUserMessage(NgxLoggerLevel.WARN, message, additional);
  }

  error(message: any, ...additional: any[]): void {
    this.logger.error(message, additional);
    this.queueUserMessage(NgxLoggerLevel.ERROR, message, additional);
  }

  fatal(message: any, ...additional: any[]): void {
    this.logger.fatal(message, additional);
    this.queueUserMessage(NgxLoggerLevel.FATAL, message, additional);
  }

  private queueUserMessage(level: NgxLoggerLevel, message: any, ...additional: any[]): void {
    if (this.userQueueLevel >= level) {
      this.pushQueueMessage(this.userQueue, this.buildPayload(level, message, additional));
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


