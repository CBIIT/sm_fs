import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { SearchFilterService } from '../search/search-filter.service';

@Component({
  selector: 'app-funding-request',
  templateUrl: './funding-request.component.html',
  styleUrls: ['./funding-request.component.css'],
  providers: [SearchFilterService]
})
export class FundingRequestComponent implements OnInit {
  activeStep={step:0,name:'',route:''};
  steps=[
    {step:1, name:'Select Grant', route:'/request/step1'},
    {step:2, name:'Request Info', route:'/request/step2'},
    {step:3, name:'Supporting Docs', route:'/request/step3'},
    {step:4, name:'Review', route:'/request/step4'},
  ];

  constructor(private route:ActivatedRoute,
              private router:Router) { }

  ngOnInit(): void {
    this.router.events.subscribe((val)=>{
      console.log("Router event", val)
      if (val instanceof NavigationStart) {
        for (var step of this.steps) {
          if (step.route===val.url)
            this.activeStep=step;
        }   
      }
    });
    
    //when direct access using url
    for (var step of this.steps) {
      if (step.route===this.router.url)
        this.activeStep=step;
    }   
     
  }



}
