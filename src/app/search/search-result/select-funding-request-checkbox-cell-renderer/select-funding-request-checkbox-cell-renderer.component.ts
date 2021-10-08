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
  @Input()
  id: string = '';

  @Output()
  emitter = new Subject<any>();

  ngOnInit(): void {
  }

  onSelect($event: any) {
    this.data.selected = $event.target.checked;
    this.emitter.next(this.data);
  }

  ngOnDestroy() {
    this.emitter.unsubscribe();
  }
}
