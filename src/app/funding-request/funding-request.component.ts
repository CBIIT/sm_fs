import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SearchFilterService } from '../search/search-filter.service';

@Component({
  selector: 'app-funding-request',
  templateUrl: './funding-request.component.html',
  styleUrls: ['./funding-request.component.css'],
  providers: [SearchFilterService]
})
export class FundingRequestComponent implements OnInit, OnDestroy {
  activeStep={step:0,name:'',route:''};
  steps=[
    {step:1, name:'Select Grant', route:'/request/step1'},
    {step:2, name:'Request Info', route:'/request/step2'},
    {step:3, name:'Supporting Docs', route:'/request/step3'},
    {step:4, name:'Review', route:'/request/step4'},
  ];

  private routerSub:Subscription;

  constructor(private route:ActivatedRoute,
              private router:Router) { }
  
  ngOnDestroy(): void {
    if (this.routerSub && !this.routerSub.closed)
        this.routerSub.unsubscribe();
  }

  ngOnInit(): void {
    this.routerSub=this.router.events.subscribe((val)=>{
      console.log("Router event", val)
      if (val instanceof NavigationEnd) {
        for (var step of this.steps) {
          if (step.route===val.urlAfterRedirects) {
            console.log("matched URL");
            this.activeStep=step;
            break;
          }
        }   
      }
    });
    
    //when direct access using url
    for (var step of this.steps) {
      if (step.route===this.router.url) {
        console.log("oninit matched url");
        this.activeStep=step;
      }
    }   
  }

  

}
