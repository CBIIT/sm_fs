import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-fundable-score-range',
  templateUrl: './fundable-score-range.component.html',
  styleUrls: ['./fundable-score-range.component.css']
})
export class FundableScoreRangeComponent implements OnInit {
  // TODO - build model in parent for passing these
  @Input() minimumScore: number;
  @Input() maximumScore: number;

  constructor(private logger: NGXLogger, private planModel: PlanModel) {
  }

  ngOnInit(): void {
  }

  applicationsWithinRange(): NciPfrGrantQueryDto[] {
    return this.planModel.allGrants.filter(g => g.priorityScoreNum >= this.minimumScore && g.priorityScoreNum <= this.maximumScore);
  }

  applicationsOutsideRange(): NciPfrGrantQueryDto[] {
    return this.planModel.allGrants.filter(g => g.priorityScoreNum < this.minimumScore || g.priorityScoreNum > this.maximumScore);
  }

}
