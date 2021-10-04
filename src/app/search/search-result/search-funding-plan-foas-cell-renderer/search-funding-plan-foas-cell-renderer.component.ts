import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-search-funding-plan-foas-cell-renderer',
  templateUrl: './search-funding-plan-foas-cell-renderer.component.html',
  styleUrls: ['./search-funding-plan-foas-cell-renderer.component.css']
})
export class SearchFundingPlanFoasCellRendererComponent implements OnInit {

  @Input()
  data : any = {}

  constructor() { }

  ngOnInit(): void {
  }

}
