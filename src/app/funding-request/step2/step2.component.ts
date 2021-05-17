import {Component, Inject, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RequestModel} from '../../model/request-model';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {errorObject, isNumeric} from 'rxjs/internal-compatibility';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {
  _selectedDocs: string;

  get selectedDocs(): string {
    return this._selectedDocs;
  }

  set selectedDocs(value: string) {
    this.requestModel.requestDto.otherDocsText = value;
    this.requestModel.requestDto.financialInfoDto.otherDocText = value;
    this._selectedDocs = value;
    if (value) {
      this.requestModel.requestDto.otherDocsFlag = 'Y';
      this.requestModel.requestDto.financialInfoDto.otherDocFlag = 'Y';
    } else {
      this.requestModel.requestDto.otherDocsFlag = undefined;
      this.requestModel.requestDto.financialInfoDto.otherDocFlag = undefined;
    }
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
    this.saveFundingRequest('/request/step3');
  }

  saveAsDraft(): void {
    this.saveFundingRequest('/request/step4');
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

  saveFundingRequest(navigate: string): void {
    if (!this.isSaveable()) {
      console.log('Can\'t save at this point');
      return;
    }
    // TODO: make sure model is properly constructed
    console.log(JSON.stringify(this.requestModel.requestDto));
    this.fsRequestControllerService.saveRequestUsingPOST(this.requestModel.requestDto).subscribe(
      result => {
        this.requestModel.requestDto = result;
        if (navigate) {
          this.router.navigate([navigate]);
        }

        console.log(JSON.stringify(this.requestModel.requestDto));

      }, error => {
        // TODO: properly handle errors here
        console.log('HttpClient get request error for----- ' + error.message);
      }
    );
  }

  isSaveable(): boolean {
    return this.model.canSave();
  }

  showPrc(): boolean {
    return isNumeric(this.requestModel.requestDto.frtId);
  }

}
