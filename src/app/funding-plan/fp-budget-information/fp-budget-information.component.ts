import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-fp-budget-information',
  templateUrl: './fp-budget-information.component.html',
  styleUrls: ['./fp-budget-information.component.css']
})
export class FpBudgetInformationComponent implements OnInit {
  listGrantsSelected: NciPfrGrantQueryDtoEx[];


  constructor(
    public planModel: PlanModel,
    private logger: NGXLogger,
    private requestService: FsRequestControllerService) { }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

    // this.logger.debug('planModel', this.planModel);
    this.planModel?.fundingPlanDto?.fpFinancialInformation?.fundingRequests?.forEach(r => {
      r.financialInfoDto?.fundingRequestCans?.forEach(c => {
        this.logger.debug('source, default type, type', c.fseId, c.oefiaTypeId, c.octId);
      });
    });
  }

}
