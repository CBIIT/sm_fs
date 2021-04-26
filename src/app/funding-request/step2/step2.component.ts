import {Component, Inject, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {

  private _requestModel: RequestModel;

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');

  constructor(private router: Router, requestModel: RequestModel,
              private propertiesService: AppPropertiesService) {
    this._requestModel = requestModel;
  }

  ngOnInit(): void {
    console.log(this._requestModel.requestName);
    console.log(this._requestModel.grant);
  }

  nextStep(): void {
    this.router.navigate(['/request/step3']);
  }

  prevStep(): void {
    this.router.navigate(['/request/step1']);
  }

  get grant(): NciPfrGrantQueryDto {
    return this._requestModel.grant;
  }

  get requestModel(): RequestModel {
    return this._requestModel;
  }

}
