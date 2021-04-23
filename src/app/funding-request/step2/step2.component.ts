import {Component, Inject, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {

  constructor(private router: Router, private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    console.log(this.requestModel.title);
    console.log(this.requestModel.grant);
  }

  nextStep(): void {
    this.router.navigate(['/request/step3']);
  }

  prevStep(): void {
    this.router.navigate(['/request/step1']);
  }

}
