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
  private paused = false;
  private pauseTimeout = 60000;
  private retryQueue: NgxPayload[] = [];
  private userQueue: NgxPayload[] = [];
  private MAX_QUEUE = 20;

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

  private pushQueueMessage(queue: NgxPayload[], body: NgxPayload): void {
    if (queue.length > this.MAX_QUEUE) {
      queue.shift();
    }
    queue.push(body);
  }

  private clearUserQueue(): void {
    this.userQueue = [];
  }

  getUserQueue(): NgxPayload[] {
    return this.userQueue;
  }

  /**
   * Unlike the proxy log methods below, this method will attach additional diagnostic data to the message sent to
   * the server.
   */
  logMessageWithContext(msg: any, ...extra: any[]): void {
    const logBody: NgxPayload = this.buildPayload(NgxLoggerLevel.INFO, msg, extra);
    this.pushQueueMessage(this.userQueue, logBody);
    this.post(logBody);
  }

  /**
   * As above, this method will log an error to the server with additional diagnostic data, including any messages
   * that have been added to the userQueue
   */
  logErrorWithContext(msg: any, ...extra: any[]): void {
    const logBody: NgxPayload = this.buildPayload(NgxLoggerLevel.ERROR, msg, [...extra, this.userQueue]);
    this.post(logBody);
    this.clearUserQueue();
  }

  private buildPayload(level: NgxLoggerLevel, msg: any, ...extra: any[]): NgxPayload {
    return {
      fileName: '',
      level: +level,
      lineNumber: '',
      message: msg,
      timestamp: `${Date.now()}`,
      additional: [this.getDiagnostics(), extra],
    };
  }

  // TODO: Modify this method to add additional diagnostic data
  // TODO: Parameterize applicationId
  private getDiagnostics(): DiagnosticPayload {
    return {
      userId: this.userService.currentUserValue.nihNetworkId,
      applicationId: 'FUNDING_SELECTIONS',
      sessionId: this.heartbeatService.sessionId,
      currentRoute: this.router.url,
      envProperties: environment,
    };
  }

  private post(logBody: NgxPayload): void {
    if (this.sendLog && !this.paused) {
      this.logService.saveLogUsingPOST(logBody).subscribe(() => {
      }, error => {
        this.logger.warn(`Error saving message to server: ${JSON.stringify(error)}`);
        this.logger.warn(`Offending message: ${JSON.stringify(logBody)}`);
        this.pushQueueMessage(this.retryQueue, logBody);
        this.pause();
      });
    } else {
      // this.logger.warn('Heartbeat indicates service is down; queing message for later send');
      this.pushQueueMessage(this.retryQueue, logBody);
    }
  }

  private pause(): void {
    this.logger.debug('Pause server logging for 60 seconds due to unknown error');
    this.paused = true;
    setTimeout(() => {
      this.logger.debug('Restart server logging after pause');
      this.paused = false;
    }, this.pauseTimeout);
  }

  private sendQueuedMessages(queue: NgxPayload[]): void {
    let m: NgxPayload;
    while (typeof (m = queue.shift()) !== 'undefined') {
      this.post(m);
    }
  }

  /*
   * Proxy methods for NGXLogger. They will be logged using NGXLogger, as well as added to the queue of user messages
   * which are sent with the payload when the logErrorWithContext method is called. Since they defer to NGXLogger,
   * they may be sent to the server as well, depending on how NGXLogger is configured. Note that .error() and .fatal()
   * messages are NOT queued, since they should be logged immediately, and they will not carry the extra diagnostics
   * or user queue provided by the logErrorWithContext() method. If you want that context, use logErrorWithContext().
   */
  trace(message: any, ...additional: any[]): void {
    this.logger.trace(message, additional);
    this.queueUserMessage(NgxLoggerLevel.TRACE, message, additional);
  }

  debug(message: any, ...additional: any[]): void {
    this.logger.debug(message, additional);
    this.queueUserMessage(NgxLoggerLevel.DEBUG, message, additional);
  }

  info(message: any, ...additional: any[]): void {
    this.logMessageWithContext(message, additional);
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
  }

  fatal(message: any, ...additional: any[]): void {
    this.logger.fatal(message, additional);
  }

  /**
   * Queue the attached message if its level exceeds the cutoff set above. This will send it with any error messages
   * logged to the server as part of its diagnostic payload.
   */
  private queueUserMessage(level: NgxLoggerLevel, message: any, ...additional: any[]): void {
    if (+level >= +this.userQueueLevel) {
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
}


