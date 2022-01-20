import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { HeartbeatControllerService } from '@cbiit/i2ecws-lib';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  public heartBeat = new Subject<boolean>();
  public sessionId: string;

  constructor(
    private logger: NGXLogger,
    private heartbeatController: HeartbeatControllerService) {
    setInterval(() => {
      heartbeatController.getHeartBeatUsingGET().subscribe(next => {
        // this.logger.debug(`ping: ${next.sessionId}`);
        this.logger.debug('Yay! Service is up :)');
        this.sessionId = next.sessionId;
        this.heartBeat.next(true);
      }, error => {
        this.logger.debug('Boo! Service is down :(');
        this.heartBeat.next(false);
      });
    }, 1000);
  }
}
