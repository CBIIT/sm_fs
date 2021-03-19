import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchFilterService } from '../search/search-filter.service';

@Component({
  selector: 'app-funding-request',
  templateUrl: './funding-request.component.html',
  styleUrls: ['./funding-request.component.css'],
  providers: [SearchFilterService]
})
export class FundingRequestComponent implements OnInit {
  activeStep;
  steps=[
    {step:1, name:'Select Grant', route:'step1'},
    {step:2, name:'Request Info', route:'step2'},
    {step:3, name:'Supporting Docs', route:'step3'},
    {step:4, name:'Review', route:'step4'},
  ];

  constructor(private route:ActivatedRoute) { }

  ngOnInit(): void {
    this.activeStep=this.steps[2];
    console.log("Route is",this.route);
  }

}
