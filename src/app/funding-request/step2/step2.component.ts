import {Component, Inject, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {

  private requestModel: RequestModel;

  constructor(private router: Router, requestModel: RequestModel) {
    this.requestModel = requestModel;
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

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

}
