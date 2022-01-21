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

  private _sessionId: string;
  private _dbActive: boolean;

  private heartbeatInterval: NodeJS.Timeout;
  private dbHeartbeatInterval: NodeJS.Timeout;

  private lastGoodHeartbeat: number;
  private lastGoodDbHeartbeat: number;

  constructor(
    private logger: NGXLogger,
    private heartbeatController: HeartbeatControllerService) {
    this.startDefaultHeartbeat();
    this.startDefaultDbHeartbeat();
  }

  startDefaultHeartbeat(): void {
    this.startHeartbeat(1000);
  }

  startHeartbeat(millis: number): void {
    this.heartbeatInterval = setInterval(() => {
      this.heartbeatController.getHeartBeatUsingGET().subscribe(next => {
        // this.logger.debug(`ping: ${next.sessionId}`);
        this.sessionId = next.sessionId;
        this.lastGoodHeartbeat = Date.now();
        this.heartBeat.next(true);
      }, error => {
        this.heartBeat.next(false);
      });
    }, millis);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
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
        if(next.dbActive) {
          this.lastGoodDbHeartbeat = Date.now();
        }
        this.dbHeartBeat.next(next.dbActive);
      }, error => {
        // Technically speaking, DB status is unknown at this point, since this indicates the API itself is not responding
        this.dbHeartBeat.next(false);
      });
    }, millis);
  }

  stopDbHeartbeat(): void {
    if (this.dbHeartbeatInterval) {
      clearInterval(this.dbHeartbeatInterval);
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
