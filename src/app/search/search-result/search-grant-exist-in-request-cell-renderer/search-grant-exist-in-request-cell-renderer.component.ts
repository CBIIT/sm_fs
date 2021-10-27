import {Component, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";

@Component({
  selector: 'app-search-grant-exist-in-request-cell-renderer',
  templateUrl: './search-grant-exist-in-request-cell-renderer.component.html',
  styleUrls: ['./search-grant-exist-in-request-cell-renderer.component.css']
})
export class SearchGrantExistInRequestCellRendererComponent implements OnInit {

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
}
