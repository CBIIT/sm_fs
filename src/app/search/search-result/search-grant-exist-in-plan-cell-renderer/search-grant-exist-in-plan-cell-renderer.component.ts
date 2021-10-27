import {Component, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {FundingRequestTypes} from "../../../model/request/funding-request-types";

@Component({
  selector: 'app-search-grant-exist-in-plan-cell-renderer',
  templateUrl: './search-grant-exist-in-plan-cell-renderer.component.html',
  styleUrls: ['./search-grant-exist-in-plan-cell-renderer.component.css']
})
export class SearchGrantExistInPlanCellRendererComponent implements OnInit {

  @Input()
  data : any = {}

  @Output()
  emitter = new Subject<any>();

  constructor() { }

  ngOnInit(): void {
  }

  onSelect(frqId: number) {
    this.emitter.next(frqId);
  }

  ngOnDestroy() {
    this.emitter.unsubscribe();
  }

  getCategory(frtId: number) {
    if (frtId === FundingRequestTypes.FUNDING_PLAN__PROPOSED_AND_WITHIN_FUNDING_PLAN_SCORE_RANGE ||
        frtId === FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_EXCEPTION) {
      return 'Proposed for Funding';
    }
    if (frtId === FundingRequestTypes.FUNDING_PLAN__FUNDING_PLAN_SKIP) {
      return 'Skipped';
    }
    if (frtId === FundingRequestTypes.FUNDING_PLAN__NOT_PROPOSED_AND_OUTSIDE_FUNDING_PLAN_SCORE_RANGE ||
        frtId === FundingRequestTypes.FUNDING_PLAN__NOT_SELECTABLE_FOR_FUNDING_PLAN) {
      return 'Not Considered for Funding';
    }
    return 'Unknown category (' + frtId + ')';
  }
}
