import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { PlanModel } from '../../model/plan/plan-model';

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

  constructor(public model: PlanModel) {
  }

  ngOnInit(): void {
    this.skip = this.isSkip();
    this.exception = this.isException();
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
