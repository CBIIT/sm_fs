import {Component, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {SelectGrantCheckboxEventType} from "../../../funding-plan/plan-step1/select-grant-checkbox-cell-renderer/select-grant-checkbox-event-type";

@Component({
  selector: 'app-select-funding-request-checkbox-cell-renderer',
  templateUrl: './select-funding-request-checkbox-cell-renderer.component.html',
  styleUrls: ['./select-funding-request-checkbox-cell-renderer.component.css']
})
export class SelectFundingRequestCheckboxCellRendererComponent implements OnInit, OnDestroy {

  constructor() { }

  @Input()
  data: any = {};

  @Output()
  emitter = new Subject<SelectGrantCheckboxEventType>();

  ngOnInit(): void {
  }

  onSelect($event: any) {
    this.data.selector = $event.target.checked;
    this.emitter.next({
      applId: this.data.frqId,
      selected: $event.target.checked
    });
  }

  ngOnDestroy() {
    this.emitter.unsubscribe();
    // console.debug('ngOnDestroy', this.data);
  }
}
