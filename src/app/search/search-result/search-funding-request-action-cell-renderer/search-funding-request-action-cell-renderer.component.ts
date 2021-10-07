import {Component, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Router} from "@angular/router";
import {Subject} from "rxjs";

@Component({
  selector: 'app-search-funding-request-action-cell-renderer',
  templateUrl: './search-funding-request-action-cell-renderer.component.html',
  styleUrls: ['./search-funding-request-action-cell-renderer.component.css']
})
export class SearchFundingRequestActionCellRendererComponent implements OnInit, OnDestroy {

  @Input()
  data : any = {}

  @Output()
  emitter = new Subject<any>()

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  select() {
    this.emitter.next(this.data);
    // this.router.navigate(['request/retrieve', fundingRequest.frqId]);
  }

  ngOnDestroy() {
    this.emitter.unsubscribe();
  }
}
