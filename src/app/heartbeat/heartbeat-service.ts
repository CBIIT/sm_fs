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

  private heartbeatInterval: NodeJS.Timeout;
  private dbHeartbeatInterval: NodeJS.Timeout;
  private circuitBreakerInterval: NodeJS.Timeout;

  private lastGoodHeartbeat: number;
  private lastGoodDbHeartbeat: number;
  private startTime: number = Date.now();

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
      this.pullThePlug();
    });
  }

  startCircuitBreaker(): void {
    this.logger.info(`Starting circuit breaker: ${this.KILLSWITCH_INTERVAL} millis`);
    this.circuitBreakerInterval = setInterval(() => {
      const zeroHour: number = this.lastGoodDbHeartbeat || this.startTime;
      this.logger.debug(`${Date.now() - this.lastGoodHeartbeat} millis since last good heartbeat`);
      this.logger.debug(`${Date.now() - this.lastGoodDbHeartbeat} millis since last good DB heartbeat`);
      this.logger.debug(`${this.KILLSWITCH_INTERVAL - (Date.now() - zeroHour)} millis until termination`);
      // TODO: use the killswitch if the time since last good heartbeat is too long
      if (Date.now() - zeroHour >= this.KILLSWITCH_INTERVAL) {
        this.killSwitch.next();
      }
    }, this.KILLSWITCH_INTERVAL);
  }

  stopCircuitBreaker(): void {
    if (this.circuitBreakerInterval) {
      clearInterval(this.circuitBreakerInterval);
      this.circuitBreakerInterval = undefined;
    }
  }

  startDefaultHeartbeat(): void {
    if (!this.heartbeatInterval) {
      this.startHeartbeat(this.HEARTBEAT_INTERVAL);
    }
  }

  startHeartbeat(millis: number): void {
    this.logger.info(`Starting heartbeat: ${this.HEARTBEAT_INTERVAL} millis`);
    this.heartbeatInterval = setInterval(() => {
      this.heartbeatController.getHeartBeatUsingGET().subscribe(next => {
        // this.logger.debug(`ping: ${next.sessionId}`);
        this.sessionId = next.sessionId;
        this.lastGoodHeartbeat = Date.now();
        this.heartBeat.next(true);
      }, error => {
        // TODO: if we get a timeout here (only timeout), kill the heartbeat until the user logs back in.
        // NOTE: the heartbeat will get automatically restarted once the DB heartbeat reports success.
        this.logger.debug(`Received error: ${JSON.stringify(error)}`);
        this.logger.debug(`API not responding. Last good hearbeat: ${Date.now() - this.lastGoodHeartbeat} millis ago`);
        this.heartBeat.next(false);
      });
    }, millis);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      this.logger.info('Stopping heartbeat');
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  startDefaultDbHeartbeat(): void {
    this.startDbHeartbeat(this.DB_HEARTBEAT_INTERVAL);
  }

  startDbHeartbeat(millis: number): void {
    this.logger.info(`Starting DB heartbeat: ${this.DB_HEARTBEAT_INTERVAL} millis`);
    this.dbHeartbeatInterval = setInterval(() => {
      this.heartbeatController.getDbHeartBeatUsingGET().subscribe(next => {
        this.sessionId = next.sessionId;
        this.dbActive = next.dbActive;
        if (next.dbActive) {
          this.lastGoodDbHeartbeat = Date.now();
          this.startDefaultHeartbeat();
        } else {
          this.logger.debug(`DB is not responsive. Last good heartbeat: ${Date.now() - this.lastGoodDbHeartbeat} millis ago`);
          this.stopHeartbeat();
        }
        this.dbHeartBeat.next(next.dbActive);
      }, error => {
        // Technically speaking, DB status is unknown at this point, since this indicates the API itself is not responding
        this.stopHeartbeat();
        this.logger.debug(`DB status unknown. Last good heartbeat: ${Date.now() - this.lastGoodDbHeartbeat} millis`);
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
    this.logger.error('Pulling the plug');
    this.stopHeartbeat();
    this.stopCircuitBreaker();
    this.stopDbHeartbeat();
  }
}
