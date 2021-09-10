import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';

@Component({
  selector: 'app-applications-proposed-for-funding-readonly',
  templateUrl: './applications-proposed-for-funding-readonly.component.html',
  styleUrls: ['./applications-proposed-for-funding-readonly.component.css']
})
export class ApplicationsProposedForFundingReadonlyComponent implements OnInit {
  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  constructor(public planModel: PlanModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug('all grants:', this.planModel.allGrants);
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.logger.debug('selected grants:', this.listGrantsSelected);
  }

}
