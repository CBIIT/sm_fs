import { Component, Input, OnInit } from '@angular/core';
import { GrantCostPayload, PlanManagementService } from '../service/plan-management.service';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';

@Component({
  selector: 'app-oefia-type-renderer',
  templateUrl: './oefia-type-renderer.component.html',
  styleUrls: ['./oefia-type-renderer.component.css']
})
export class OefiaTypeRendererComponent implements OnInit {
  grantCosts: GrantCostPayload[];
  @Input() grant: NciPfrGrantQueryDtoEx;


  constructor(private planManagementService: PlanManagementService) {
  }

  ngOnInit(): void {
    this.grantCosts = this.planManagementService.grantCosts.filter(g => g.applId === this.grant.applId);
  }

}
