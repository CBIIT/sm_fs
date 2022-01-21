import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { HeartbeatControllerService } from '@cbiit/i2ecws-lib';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  public heartBeat = new Subject<boolean>();
  public dbHeartBeat = new Subject<boolean>();
  public killSwitch = new Subject<void>();

  private _sessionId: string;
  private _dbActive: boolean;

  private heartbeatInterval: NodeJS.Timeout;
  private dbHeartbeatInterval: NodeJS.Timeout;
  private circuitBreakerInterval: NodeJS.Timeout;

  private lastGoodHeartbeat: number;
  private lastGoodDbHeartbeat: number;
  private startTime: number = Date.now();

  constructor(
    private logger: NGXLogger,
    private heartbeatController: HeartbeatControllerService) {
    this.startDefaultHeartbeat();
    this.startDefaultDbHeartbeat();
    this.startCircuitBreaker();
    this.killSwitch.subscribe(() => {
      this.pullThePlug();
    });
  }

  startCircuitBreaker(): void {
    this.circuitBreakerInterval = setInterval(() => {
      const zeroHour: number = this.lastGoodDbHeartbeat || this.startTime;
      this.logger.debug(`${Date.now() - this.lastGoodHeartbeat} millis since last good heartbeat`);
      this.logger.debug(`${Date.now() - this.lastGoodDbHeartbeat} millis since last good DB heartbeat`);
      this.logger.debug(`${300000 - (Date.now() - zeroHour)} millis until termination`);
      // TODO: use the killswitch if the time since last good heartbeat is too long
      if (Date.now() - zeroHour >= 300000 /* 5 minutes */) {
        this.killSwitch.next();
      }
    }, 30000);
  }

  stopCircuitBreaker(): void {
    if (this.circuitBreakerInterval) {
      clearInterval(this.circuitBreakerInterval);
      this.circuitBreakerInterval = undefined;
    }
  }

  startDefaultHeartbeat(): void {
    if (!this.heartbeatInterval) {
      this.startHeartbeat(1000);
    }
  }

  startHeartbeat(millis: number): void {
    this.logger.warn('Starting heartbeat');
    this.heartbeatInterval = setInterval(() => {
      this.heartbeatController.getHeartBeatUsingGET().subscribe(next => {
        // this.logger.debug(`ping: ${next.sessionId}`);
        this.sessionId = next.sessionId;
        this.lastGoodHeartbeat = Date.now();
        this.heartBeat.next(true);
      }, error => {
        this.logger.warn(`Received error: ${JSON.stringify(error)}`);
        this.logger.warn(`API not responding. Last good hearbeat: ${Date.now() - this.lastGoodHeartbeat} millis ago`);
        this.heartBeat.next(false);
      });
    }, millis);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      this.logger.warn('Stopping heartbeat');
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  startDefaultDbHeartbeat(): void {
    this.startDbHeartbeat(10000);
  }

  startDbHeartbeat(millis: number): void {
    this.dbHeartbeatInterval = setInterval(() => {
      this.heartbeatController.getDbHeartBeatUsingGET().subscribe(next => {
        this.sessionId = next.sessionId;
        this.dbActive = next.dbActive;
        if (next.dbActive) {
          this.lastGoodDbHeartbeat = Date.now();
          this.startDefaultHeartbeat();
        } else {
          this.logger.warn(`DB is not responsive. Last good heartbeat: ${Date.now() - this.lastGoodDbHeartbeat} millis ago`);
          this.stopHeartbeat();
        }
        this.dbHeartBeat.next(next.dbActive);
      }, error => {
        // Technically speaking, DB status is unknown at this point, since this indicates the API itself is not responding
        this.stopHeartbeat();
        this.logger.warn(`DB status unknown. Last good heartbeat: ${Date.now() - this.lastGoodDbHeartbeat} millis`);
        this.heartBeat.next(false);
        this.dbHeartBeat.next(false);
      });
    }, millis);
  }

  stopDbHeartbeat(): void {
    if (this.dbHeartbeatInterval) {
      clearInterval(this.dbHeartbeatInterval);
      this.dbHeartbeatInterval = undefined;
    }
  }

  get sessionId(): string {
    return this._sessionId;
  }

  set sessionId(value: string) {
    this._sessionId = value;
  }

  get dbActive(): boolean {
    return this._dbActive;
  }

  set dbActive(value: boolean) {
    this._dbActive = value;
  }

  private pullThePlug(): void {
    this.logger.warn('Pulling the plug');
    this.stopHeartbeat();
    this.stopCircuitBreaker();
    this.stopDbHeartbeat();
  }
}
