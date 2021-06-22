import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestIntegrationService } from '../integration/integration.service';

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css']
})
export class WorkflowComponent implements OnInit {

  @Input() readonly = false;

  comments = '';

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
  }

  setActiveApprover(event): void {
    this.requestIntegrationService.activeApproverEmitter.next(event);
  }
}
