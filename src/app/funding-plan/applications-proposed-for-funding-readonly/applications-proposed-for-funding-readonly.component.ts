import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanManagementService } from '../service/plan-management.service';

@Component({
  selector: 'app-applications-proposed-for-funding-readonly',
  templateUrl: './applications-proposed-for-funding-readonly.component.html',
  styleUrls: ['./applications-proposed-for-funding-readonly.component.css']
})
export class ApplicationsProposedForFundingReadonlyComponent implements OnInit {
  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  constructor(public planModel: PlanModel,
              public planManagementService: PlanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
  }

  firstFunder(applId: number, fundingSourceId: number): boolean {
    return this.planManagementService.firstFunder(applId, fundingSourceId);
  }

  directCost(applId: number, fseId: number): number {
    return this.planManagementService.directCost(applId, fseId);
  }

  directCostPercentCut(applId: number, fseId: number): number {
    return this.planManagementService.directCostPercentCut(applId, fseId);
  }

  totalCost(applId: number, fseId: number): number {
    return this.planManagementService.totalCost(applId, fseId);
  }

  totalCostPercentCut(applId: number, fseId: number): number {
    return this.planManagementService.totalCostPercentCut(applId, fseId);
  }

  sourceDirectTotal(fseId: number): number {
    return this.planManagementService.sourceDirectTotal(fseId);
  }

  sourceTotalTotal(fseId: number): number {
    return this.planManagementService.sourceTotalTotal(fseId);
  }

  grandTotalDirect(): number {
    return this.planManagementService.grandTotalDirect();
  }

  grandTotalTotal(): number {
    return this.planManagementService.grandTotalTotal();
  }

  requestTotalDirect(applId: number): number {
    return this.planManagementService.requestDirectTotal(applId);
  }

  requestTotalTotal(applId: number): number {
    return this.planManagementService.requestTotalTotal(applId);
  }
}

