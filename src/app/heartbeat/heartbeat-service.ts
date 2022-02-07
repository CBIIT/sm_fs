import { Injectable } from '@angular/core';
import { HeartbeatControllerService } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Subject } from 'rxjs';
import { AppPropertiesService } from '../service/app-properties.service';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  public heartBeat = new Subject<boolean>();
  public dbHeartBeat = new Subject<boolean>();
  public killSwitch = new Subject<void>();

  private HEARTBEAT_INTERVAL: number;
  private DB_HEARTBEAT_INTERVAL: number;
  private KILLSWITCH_INTERVAL: number;

  private _sessionId: string;
  private _dbActive: boolean;

  private heartbeatInterval: number;
  private dbHeartbeatInterval: number;
  private circuitBreakerInterval: number;

  private lastGoodHeartbeat: number;
  private lastGoodDbHeartbeat: number;
  private startTime: number = Date.now();

  private setIntervalFunction = window.setInterval;
  private clearIntervalFunction = window.clearInterval;

  // TODO: can't use CustomLogger here because of circular dependency. Resolve that...
  constructor(
    private logger: NGXLogger,
    private heartbeatController: HeartbeatControllerService,
    private appPropertiesService: AppPropertiesService) {
    this.HEARTBEAT_INTERVAL = +appPropertiesService.getProperty('HEARTBEAT_INTERVAL') || 10000;
    this.DB_HEARTBEAT_INTERVAL = +appPropertiesService.getProperty('DB_HEARTBEAT_INTERVAL') || 20000;
    this.KILLSWITCH_INTERVAL = +appPropertiesService.getProperty('KILLSWITCH_INTERVAL') || 300000;
    this.startDefaultHeartbeat();
    this.startDefaultDbHeartbeat();
    this.startCircuitBreaker();
    this.killSwitch.subscribe(() => {
      this.logger.debug(`Killswitch activated. Stopping timers`);
      this.pause();
    });
  }

  public pause(): void {
    this.logger.debug('Pause...');
    this.stopHeartbeat();
    this.stopDbHeartbeat();
    this.stopCircuitBreaker();
  }

  public continue(): void {
    this.logger.debug('Continue...');
    this.startDefaultHeartbeat();
    this.startDefaultDbHeartbeat();
    this.startCircuitBreaker();
  }

  startCircuitBreaker(): void {
    if (!this.circuitBreakerInterval) {
      this.logger.info(`Starting circuit breaker: ${this.KILLSWITCH_INTERVAL} millis`);

      this.circuitBreakerInterval = this.setIntervalFunction(() => {
        const zeroHour: number = this.lastGoodDbHeartbeat || this.startTime;
        this.logger.debug(`[${this.circuitBreakerInterval}] ${Date.now() - this.lastGoodHeartbeat} millis since last good heartbeat`);
        this.logger.debug(`[${this.circuitBreakerInterval}]${Date.now() - this.lastGoodDbHeartbeat} millis since last good DB heartbeat`);
        this.logger.debug(`[${this.circuitBreakerInterval}]${this.KILLSWITCH_INTERVAL - (Date.now() - zeroHour)} millis until termination`);
        // TODO: use the killswitch if the time since last good heartbeat is too long
        if (Date.now() - zeroHour >= this.KILLSWITCH_INTERVAL) {
          this.killSwitch.next();
        }
      }, this.KILLSWITCH_INTERVAL);
      this.logger.debug(`Circuitbreaker interval created: ${this.circuitBreakerInterval}`);
    } else {
      this.logger.info(`Circuit breaker ${this.circuitBreakerInterval} already running`);
    }
  }

  stopCircuitBreaker(): void {
    if (this.circuitBreakerInterval) {
      this.logger.info(`[${this.circuitBreakerInterval}] Stopping circuit breaker`);
      this.clearIntervalFunction(this.circuitBreakerInterval);
      this.circuitBreakerInterval = undefined;
    }
  }

  startDefaultHeartbeat(): void {
    if (!this.heartbeatInterval) {
      this.startHeartbeat(this.HEARTBEAT_INTERVAL);
    }
  }

  startHeartbeat(millis: number): void {
    if (!this.heartbeatInterval) {
      this.logger.info(`Starting heartbeat: ${millis} millis`);
      this.heartbeatInterval = this.setIntervalFunction(() => {
        this.logger.debug(`[${this.heartbeatInterval}] Ping`);
        this.heartbeatController.getHeartBeatUsingGET().subscribe(next => {
          // this.logger.debug(`ping: ${next.sessionId}`);
          this.sessionId = next.sessionId;
          this.lastGoodHeartbeat = Date.now();
          this.heartBeat.next(true);
        }, error => {
          this.logger.debug(`[${this.heartbeatInterval}] Received error: ${JSON.stringify(error)}`);
          this.logger.debug(`[${this.heartbeatInterval}] API not responding. Last good hearbeat: ${Date.now() - this.lastGoodHeartbeat} millis ago`);
          this.heartBeat.next(false);
        });
      }, millis);
      this.logger.debug(`Heartbeat interval created: ${this.heartbeatInterval}`);
    } else {
      this.logger.info(`Hearbeat ${this.heartbeatInterval} already running`);
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      this.logger.info(`[${this.heartbeatInterval}] Stopping heartbeat`);
      this.clearIntervalFunction(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  startDefaultDbHeartbeat(): void {
    this.startDbHeartbeat(this.DB_HEARTBEAT_INTERVAL);
  }

  startDbHeartbeat(millis: number): void {
    if (!this.dbHeartbeatInterval) {
      this.logger.info(`Starting DB heartbeat: ${millis} millis`);
      this.dbHeartbeatInterval = this.setIntervalFunction(() => {
        this.logger.debug(`[${this.dbHeartbeatInterval}] DB Ping`);
        this.heartbeatController.getDbHeartBeatUsingGET().subscribe(next => {
          this.sessionId = next.sessionId;
          this.dbActive = next.dbActive;
          if (next.dbActive) {
            this.lastGoodDbHeartbeat = Date.now();
            this.startDefaultHeartbeat();
          } else {
            this.logger.debug(`[${this.dbHeartbeatInterval}] DB is not responsive. Last good heartbeat: ${Date.now() - this.lastGoodDbHeartbeat} millis ago`);
            this.stopHeartbeat();
          }
          this.dbHeartBeat.next(next.dbActive);
        }, error => {
          // Technically speaking, DB status is unknown at this point, since this indicates the API itself is not responding
          // TODO: evalute whether this is a timeout and restart the heartbeat if so?
          this.stopHeartbeat();
          this.logger.debug(`[${this.dbHeartbeatInterval}] DB status unknown. Last good heartbeat: ${Date.now() - this.lastGoodDbHeartbeat} millis`);
          this.heartBeat.next(false);
          this.dbHeartBeat.next(false);
        });
      }, millis);
      this.logger.debug(`DB Heartbeat created: ${this.dbHeartbeatInterval}`);
    } else {
      this.logger.debug(`DB heartbeat ${this.dbHeartbeatInterval} already running`);
    }
  }

  stopDbHeartbeat(): void {
    if (this.dbHeartbeatInterval) {
      this.logger.info(`[${this.dbHeartbeatInterval}] Stopping DB heartbeat`);
      this.clearIntervalFunction(this.dbHeartbeatInterval);
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
}
