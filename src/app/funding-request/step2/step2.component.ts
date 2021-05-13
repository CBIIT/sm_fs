import {Component, Inject, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {errorObject} from 'rxjs/internal-compatibility';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {
  _selectedDocs: number[];

  get selectedDocs(): number[] {
    return this._selectedDocs;
  }

  set selectedDocs(value: number[]) {
    this._selectedDocs = value;
  }

  constructor(private router: Router, private requestModel: RequestModel,
              private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService) {
  }

  ngOnInit(): void {
    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }
    this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
        this.requestModel.requestDto.grantAwarded = result;
      }, error => {
        // TODO: properly handle errors here
        console.log('HttpClient get request error for----- ' + error.message);
      }
    );
    this.requestModel.requestDto.pdNpnId = this.requestModel.grant.pdNpnId;
  }

  saveAndContinue(): void {
    this.saveFundingRequest();
    this.router.navigate(['/request/step3']);
  }

  saveAsDraft(): void {
    this.saveFundingRequest();
    this.router.navigate(['/request/step2']);
  }

  prevStep(): void {
    // TODO - alert for unsaved changes?
    this.router.navigate(['/request/step1']);
  }

  get grant(): NciPfrGrantQueryDto {
    return this.model.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  saveFundingRequest(): void {
    // TODO: make sure model is properly constructed
    console.log(JSON.stringify(this.requestModel.requestDto));
    this.fsRequestControllerService.saveRequestUsingPOST(this.requestModel.requestDto).subscribe(
      result => {
        this.requestModel.requestDto = result;
        console.log(JSON.stringify(this.requestModel.requestDto));

      }, error => {
        // TODO: properly handle errors here
        console.log('HttpClient get request error for----- ' + error.message);
      }
    );
  }

  isSaveable(): boolean {
    console.log('Validation before saving');
    return this.model.canSave();
  }
}
