import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';

@Component({
  selector: 'app-applications-proposed-for-funding-readonly',
  templateUrl: './applications-proposed-for-funding-readonly.component.html',
  styleUrls: ['./applications-proposed-for-funding-readonly.component.css']
})
export class ApplicationsProposedForFundingReadonlyComponent implements OnInit {
  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  constructor(public planModel: PlanModel,
              private planCoordinatorService: PlanCoordinatorService,
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
    return 0;
  }

  totalCost(applId: number, fseId: number): number {
    this.logger.debug('return total cost for grant', applId, 'and source', fseId);
    return this.planCoordinatorService.totalCost(applId, fseId);
    return 0;
  }

  totalCostPercentCut(applId: number, fseId: number): number {
    this.logger.debug('return total cost percent cut for grant', applId, 'and source', fseId);
    return 0;
  }
}

