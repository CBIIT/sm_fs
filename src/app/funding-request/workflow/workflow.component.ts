import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { FundingRequestIntegrationService } from '../integration/integration.service';
import { ApproverListsComponent } from './approver-lists/approver-lists.component';

@Component({
  selector: 'app-workflow',
  templateUrl: './workflow.component.html',
  styleUrls: ['./workflow.component.css']
})
export class WorkflowComponent implements OnInit {

  @Input() readonly = false;

  comments = '';
  selectedWorkflowAction = '';
  workflowActions: {id: string, text: string}[];

  constructor(private requestIntegrationService: FundingRequestIntegrationService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    this.workflowActions = [
      {id: 'ap', text: 'Approve'},
      {id: 'ap_rt', text: 'Approve and Route'},
      {id: 'ra', text: 'Reassign'},
      {id: 'rj', text: 'Reject'},
      {id: 'rt_ap', text: 'Route before Approving'},
      {id: 'rfc', text: 'Return to PD for Changes'}
    ];

  }

  setActiveApprover(event): void {
    this.requestIntegrationService.activeApproverEmitter.next(event);
  }
}
