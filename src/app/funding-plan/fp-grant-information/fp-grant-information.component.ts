import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from '../../model/plan/plan-model';
import { GrantAwardedDto } from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import { skip } from 'rxjs/operators';
import { NGXLogger } from 'ngx-logger';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';

@Component({
  selector: 'app-fp-grant-information',
  templateUrl: './fp-grant-information.component.html',
  styleUrls: ['./fp-grant-information.component.css']
})
export class FpGrantInformationComponent implements OnInit {
  @Input() grant: NciPfrGrantQueryDtoEx;
  @Input() index: number;

  skip = false;
  exception = false;
  @Input() isModal = false;
  grantAwards: GrantAwardedDto[];
  piDirect: number;
  piTotal: number;

  constructor(public model: PlanModel, private logger: NGXLogger, private requestService: FsRequestControllerService,
              private planCoordinatorService: PlanCoordinatorService) {
  }

  ngOnInit(): void {
    this.skip = this.isSkip();
    this.exception = this.isException();

    this.requestService.getApplPeriodsUsingGET(this.grant.applId).subscribe(result => {
      this.logger.debug(result);
      this.piDirect = 0;
      this.piTotal = 0;
      this.grantAwards = result;
      result.forEach(ga => {
        if (!isNaN(ga.requestAmount)) {
          this.piDirect += Number(ga.requestAmount);
        }
        if (!isNaN(ga.requestTotalAmount)) {
          this.piTotal += Number(ga.requestTotalAmount);
        }
      });
      this.planCoordinatorService.grantInfoCostEmitter.next({index: this.index, dc: this.piDirect, tc: this.piTotal});
    });
  }

  private isSkip(): boolean {
    return (!this.grant.selected && this.grant.priorityScoreNum &&
      this.grant.priorityScoreNum >= this.model.minimumScore && this.grant.priorityScoreNum <= this.model.maximumScore);
  }

  private isException(): boolean {
    return (this.grant.selected && this.grant.priorityScoreNum &&
      this.grant.priorityScoreNum > this.model.maximumScore);
  }

}
