import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import {NciPfrGrantQueryDtoEx} from "../../model/plan/nci-pfr-grant-query-dto-ex";
import {from} from "rxjs";
import {Router} from "@angular/router";

@Component({
  selector: 'app-fundable-score-range',
  templateUrl: './fundable-score-range.component.html',
  styleUrls: ['./fundable-score-range.component.css']
})
export class FundableScoreRangeComponent implements OnInit {
  // TODO - build model in parent for passing these
  @Input() minimumScore: number;
  @Input() maximumScore: number;

  withinRangeGrants: NciPfrGrantQueryDto[];
  outsideRangeGrants: NciPfrGrantQueryDto[];

  constructor(private logger: NGXLogger,
              private router: Router,
              private planModel: PlanModel) {
  }

  ngOnInit(): void {
    if (this.planModel.allGrants && this.planModel.allGrants.length > 0) {
      // Calculate the "From" fundable score -
      // lowest numerical priority score of all grants (including non-selected in step 1
      //
      // Calculate the initial "To" score -
      // highest numerical priority score of grant applications that was selected
      let fromScore: number;
      let toScore: number;
      this.planModel.allGrants.forEach((entry: NciPfrGrantQueryDtoEx) => {
        if (entry.priorityScoreNum && (!fromScore || entry.priorityScoreNum < fromScore)) {
          fromScore = entry.priorityScoreNum;
        }
        if (entry.selected && entry.priorityScoreNum && (!toScore || entry.priorityScoreNum > toScore)) {
          toScore = entry.priorityScoreNum;
        }
      });

      this.logger.debug('From=', fromScore, ' To=', toScore);

      this.minimumScore = fromScore;
      this.maximumScore = toScore;
    }
  }

  applicationsWithinRange(): NciPfrGrantQueryDto[] {
    return this.planModel.allGrants.filter(g => g.priorityScoreNum >= this.minimumScore && g.priorityScoreNum <= this.maximumScore);
  }

  applicationsOutsideRange(): NciPfrGrantQueryDto[] {
    return this.planModel.allGrants.filter(g => g.priorityScoreNum < this.minimumScore || g.priorityScoreNum > this.maximumScore);
  }

  onApplyMaximumScore() {
    //TODO - add validation
    this.withinRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length == 0) && g.priorityScoreNum >= this.minimumScore && g.priorityScoreNum <= this.maximumScore);
    this.outsideRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length == 0) && g.priorityScoreNum < this.minimumScore || g.priorityScoreNum > this.maximumScore);
  }

  onSaveAndContinue() {
    //TODO - validate that apply button has been clicked and the value in "To" field has not been changed
    this.planModel.maximumScore = this.maximumScore;
    this.planModel.minimumScore = this.minimumScore;
    this.router.navigate(['/plan/step3']);

  }
}
