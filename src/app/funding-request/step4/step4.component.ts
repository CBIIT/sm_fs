import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {AppPropertiesService} from '../../service/app-properties.service';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
// import { request } from 'node:http';

@Component({
  selector: 'app-step4',
  templateUrl: './step4.component.html',
  styleUrls: ['./step4.component.css']
})
export class Step4Component implements OnInit {

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');

  constructor(private router: Router,
              private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestService: FsRequestControllerService) {
  }

  ngOnInit(): void {
  }

  prevStep(): void {
    this.router.navigate(['/request/step3']);
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  deleteRequest(): void {
    if (confirm('Are you sure you want to delete this request?')){
      console.log('Call deleteRequest API for frqId ', this.model.requestDto.frqId);
      this.fsRequestService.deleteRequestUsingDELETE(this.model.requestDto.frqId).subscribe(
        result => {
          console.log('Call API to delete completed route to /search, API returned ', result);
          this.router.navigate(['/search']);
        },
        error => {
          console.log('Error when calling delelteRequest API ', error);
        }
      );
    }
  }

  submitRequest(): void {
    console.log('submit request not implemented!!!');
    this.fsRequestService.submitRequestUsingPOST(this.requestModel.requestDto).subscribe(
      (result) => {
        console.log('calling submitRequestUsingPost successful, it returns', result);

      },
      (error) => {
        console.log('Failed when calling submitRequestUsingPOST', error);
      } );
  }

}
