import { Component, Input, OnInit } from '@angular/core';
import { PlanManagementService } from '../service/plan-management.service';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NGXLogger } from 'ngx-logger';
import { GrantCostPayload } from '../service/grant-cost-payload';

@Component({
  selector: 'app-oefia-type-renderer',
  templateUrl: './oefia-type-renderer.component.html',
  styleUrls: ['./oefia-type-renderer.component.css']
})
export class OefiaTypeRendererComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() g: GrantCostPayload;
  @Input() i: number;


  constructor(
    private planManagementService: PlanManagementService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
  }

  get grantCosts(): GrantCostPayload[] {
    return this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
  }

}
