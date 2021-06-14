import {Injectable} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {Alert} from './alert';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  alerts: Set<Alert> = new Set<Alert>();
  alertHash: Set<string> = new Set<string>();

  alertEmitter = new Subject<Alert>();

  pushAlert(alert: Alert): void {
    this.logger.debug(alert);
    this.logger.debug(this.alerts);
    this.logger.debug(this.alerts.has(alert));
    if (!this.alertHash.has(JSON.stringify(alert))) {
      this.alerts.add(alert);
      this.alertHash.add(JSON.stringify(alert));
      this.alertEmitter.next(alert);
    }
  }

  clearAlert(alert: Alert): void {
    this.alerts.delete(alert);
    this.alertHash.delete(JSON.stringify(alert));
  }

  clearAllAlerts(): void {
    this.alerts.clear();
    this.alertHash.clear();
  }

  constructor(private logger: NGXLogger) {
  }
}
