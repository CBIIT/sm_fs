import { Component, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { HeartbeatService } from '../../heartbeat/heartbeat-service';

@Component({
  selector: 'app-session-restore',
  templateUrl: './session-restore.component.html',
  styleUrls: ['./session-restore.component.css']
})
export class SessionRestoreComponent implements OnInit {

  constructor(private logger: NGXLogger, private heartbeatService: HeartbeatService) { }

  ngOnInit(): void {
  }

  afterRestoreClose(): void {
    this.logger.debug('session restore', window);
    this.heartbeatService.continue();
    window.close();
  }

}
