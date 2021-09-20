import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { CanCcxDto, FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit {
  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  projectedCans: Map<number, CanCcxDto> = new Map<number, CanCcxDto>();

  constructor(
    public planModel: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService,
    private canManagementService: CanManagementService) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.canManagementService.projectedCanEmitter.subscribe(next => {
      this.logger.debug('new projected CAN:', next);
      if (next.fseId) {
        this.projectedCans.set(next.fseId, next.can);
      }
    });
  }

}
