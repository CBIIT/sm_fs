import {Component, Input, OnInit} from '@angular/core';
import {Router} from "@angular/router";

@Component({
  selector: 'app-search-funding-request-action-cell-renderer',
  templateUrl: './search-funding-request-action-cell-renderer.component.html',
  styleUrls: ['./search-funding-request-action-cell-renderer.component.css']
})
export class SearchFundingRequestActionCellRendererComponent implements OnInit {

  @Input()
  data : any = {}

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  select($event: MouseEvent, fundingReqest: any) {
    this.router.navigate(['request/retrieve', fundingReqest.frqId]);
  }
}
