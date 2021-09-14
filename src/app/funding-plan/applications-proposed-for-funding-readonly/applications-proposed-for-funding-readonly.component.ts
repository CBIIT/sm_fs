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
              private planCoordinatorService: PlanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug('all grants:', this.planModel.allGrants);
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.logger.debug('selected grants:', this.listGrantsSelected);
  }

  directCost(applId: number, fseId: number): number {
    this.logger.debug('return direct cost for grant', applId, 'and source', fseId);
    return this.planCoordinatorService.directCost(applId, fseId);
  }

  directCostPercentCut(applId: number, fseId: number): number {
    this.logger.debug('return direct cost percent cut for grant', applId, 'and source', fseId);
    return this.planCoordinatorService.directCostPercentCut(applId, fseId) / 100;
  }

  totalCost(applId: number, fseId: number): number {
    this.logger.debug('return total cost for grant', applId, 'and source', fseId);
    return this.planCoordinatorService.totalCost(applId, fseId);
  }

  totalCostPercentCut(applId: number, fseId: number): number {
    this.logger.debug('return total cost percent cut for grant', applId, 'and source', fseId);
    return this.planCoordinatorService.totalCostPercentCut(applId, fseId) / 100;
  }

  sourceDirectTotal(fseId: number): number {
    return this.planCoordinatorService.sourceDirectTotal(fseId);
  }

  sourceTotalTotal(fseId: number): number {
    return this.planCoordinatorService.sourceTotalTotal(fseId);
  }

  grandTotalDirect(): number {
    return this.planCoordinatorService.grandTotalDirect();
  }

  grandTotalTotal(): number {
    return this.planCoordinatorService.grandTotalTotal();
  }

  requestTotalDirect(applId: number): number {
    return this.planCoordinatorService.requestDirectTotal(applId);
  }

  requestTotalTotal(applId: number): number {
    return this.planCoordinatorService.requestTotalTotal(applId);
  }
}

