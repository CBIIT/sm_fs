import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {AppPropertiesService} from '../../service/app-properties.service';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';
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
              private fsRequestService: FsRequestControllerService,
              private userSessionService: AppUserSessionService) {
  }

  ngOnInit(): void {
    console.log('Step4 requestModel ', this.requestModel);
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

  userCanSubmitAndDelete(): boolean {
    if (  this.userSessionService.isPD() )
    // need to add checks whether loggedOn user is the requesting pd or if the logged on user's CA
    // is the same as the requesting pd's CA && this.userSessionService.getLoggedOnUser().npnId === this.model.requestDto.requestorNpnId)
     {
        return true;
     }
     else {
       return false;
     }
  }

  submitVisible(): boolean {
    return true;
    // if (this.userCanSubmitAndDelete() && this.requestModel.requestDto.status === 'DRAFT')
    // {
    //         return true;
    // }
    // else {
    //   return false;
    // }
  }

  deleteVisible(): boolean {
    if (this.userCanSubmitAndDelete() && this.requestModel.requestDto.status !== 'SUBMITTED')
    {
            return true;
    }
    else {
      return false;
    }
  }

  submitEnabled(): boolean {
    return false;
  //  return this.requestModel.canSubmit();
  }

  submitDisableTooltip(): string {
    return 'You must upload <Justification><and><Transition Memo> to submit this request';
  }

}
