import { Component, OnInit } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { CancerActivityControllerService, RfaPaNoticesDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-funding-plan-information',
  templateUrl: './funding-plan-information.component.html',
  styleUrls: ['./funding-plan-information.component.css']
})
export class FundingPlanInformationComponent implements OnInit {
  rfaDetails: RfaPaNoticesDto[];

  constructor(public planModel: PlanModel,
              private rfaService: CancerActivityControllerService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.rfaDetails = [];
    this.planModel.grantsSearchCriteria.forEach(rfa => {
      this.rfaService.getRfaPaNoticeByNoticeNumberUsingGET(rfa.rfaPaNumber).subscribe(next => {
        this.logger.debug(next);
        this.rfaDetails.push(next);
      });
    });
  }


}
