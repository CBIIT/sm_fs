import {Component, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {SelectGrantCheckboxEventType} from "./select-grant-checkbox-event-type";

@Component({
  selector: 'app-select-grant-checkbox-cell-renderer',
  templateUrl: './select-grant-checkbox-cell-renderer.component.html',
  styleUrls: ['./select-grant-checkbox-cell-renderer.component.css']
})
export class SelectGrantCheckboxCellRendererComponent implements OnInit, OnDestroy {

  constructor() { }

  @Input()
  data : any = {}

  @Output()
  emitter = new Subject<SelectGrantCheckboxEventType>();

  ngOnInit(): void {
    // console.debug('ngOnInit', this.data.applId, this.data.fullGrantNum, this.data.selected);
  }

  onSelect($event: any) {
    this.data.selector = $event.target.checked;
    this.emitter.next({
      applId: this.data.applId,
      selected: $event.target.checked
    });
  }

  ngOnDestroy() {
    this.emitter.unsubscribe();
    // console.debug('ngOnDestroy', this.data);
  }
}
