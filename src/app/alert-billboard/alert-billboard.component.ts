import {Component, Input, OnInit} from '@angular/core';
import {Alert} from './alert';
import {NGXLogger} from 'ngx-logger';

@Component({
  selector: 'app-alert-billboard',
  templateUrl: './alert-billboard.component.html',
  styleUrls: ['./alert-billboard.component.css']
})
export class AlertBillboardComponent implements OnInit {
  @Input() alerts: Alert[];
  @Input() closeFunction = this.deleteAlert;

  constructor(private logger: NGXLogger) {
  }

  ngOnInit(): void {
  }

  deleteAlert(alert: Alert): void {
    this.logger.debug('Deleting alert now', alert);
    let i = this.alerts.indexOf(alert);
    if (i === -1) {
      this.logger.warn('Alert not found in queue');
      this.alerts.forEach((a, index) => {
        if (a.type === alert.type && a.message === alert.message) {
          console.log('found manually at index', index);
          i = index;
        }
      });
      this.alerts.splice(i, 1);
    } else {
      this.alerts.splice(i, 1);
    }
  }
}
