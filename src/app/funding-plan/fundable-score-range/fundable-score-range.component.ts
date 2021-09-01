import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { Router } from '@angular/router';

@Component({
  selector: 'app-fundable-score-range',
  templateUrl: './fundable-score-range.component.html',
  styleUrls: ['./fundable-score-range.component.css']
})
export class FundableScoreRangeComponent implements OnInit, AfterViewInit {
  // TODO - build model in parent for passing these
  @Input() minimumScore: number;
  @Input() maximumScore: number;

  withinRangeGrants: NciPfrGrantQueryDto[];
  outsideRangeGrants: NciPfrGrantQueryDto[];
  errMaxScoreRequired = false;
  errMaxScoreRange = false;
  errMaxScoreNumeric = false;

  // It stores scores that are used once apply button is clicked.
  // User can change the maximum score number and click "save and continue" without
  // clicking "Apply" - in this case the last "applied" max score
  // takes precedence and is saved in planModel
  modelMaximumScore: number;

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

      this.minimumScore = fromScore;
      this.maximumScore = toScore;
    }
  }

  /**
   *  Reset and apply maximum score if planModel already contains maximum score
   */
  ngAfterViewInit(): void {
    if (this.planModel.maximumScore && this.planModel.maximumScore >= this.minimumScore) {
      this.maximumScore = this.planModel.maximumScore;
      this.onApplyMaximumScore();
    }
  }

  private _resetView(): void {
    this.withinRangeGrants = [];
    this.outsideRangeGrants = [];
    this.modelMaximumScore = undefined;
    this.errMaxScoreRequired = false;
    this.errMaxScoreRange = false;
    this.errMaxScoreNumeric = false;
  }

  onApplyMaximumScore(): void {
    this._resetView();
    if (!this.maximumScore || this.maximumScore.toString() === '') {
      this.errMaxScoreRequired = true;
      return;
    }
    if (isNaN(Number(this.maximumScore))) {
      this.errMaxScoreNumeric = true;
      return;
    }
    if (this.maximumScore < this.minimumScore) {
      this.errMaxScoreRange = true;
      return;
    }
    this.modelMaximumScore = this.maximumScore;  // prepare for planModel
    this.withinRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0) && g.priorityScoreNum >= this.minimumScore && g.priorityScoreNum <= this.maximumScore);
    this.outsideRangeGrants = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0) && (g.priorityScoreNum < this.minimumScore || g.priorityScoreNum > this.maximumScore));
  }

  onSaveAndContinue(): void {
    if (!this.modelMaximumScore) {
      alert('You must enter valid "To" value and click Apply button to continue with next step');
      return;
    }
    this.planModel.maximumScore = this.modelMaximumScore;
    this.planModel.minimumScore = this.minimumScore;
    this.router.navigate(['/plan/step3']);

  }

  // Reset validation messages
  onMaxScoreChange($event: any): void {
    if (this.errMaxScoreRequired && $event.target.value.toString().length > 0) {
      this.errMaxScoreRequired = false;
    }
    const parsed = parseInt($event.target.value);
    if (this.errMaxScoreRange && !isNaN(parsed) && parsed >= this.minimumScore) {
      this.errMaxScoreRange = false;
    }

    if (this.errMaxScoreNumeric && !isNaN(Number($event.target.value))) {
      this.errMaxScoreNumeric = false;
    }
  }

  // Controls entering numbers only
  numberOnly($event: KeyboardEvent): boolean {
    return !isNaN(parseInt($event.key));
  }
}
