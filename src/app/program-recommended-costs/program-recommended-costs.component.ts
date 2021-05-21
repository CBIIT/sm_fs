import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {openNewWindow} from 'src/app/utils/utils';
import {Router} from '@angular/router';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';


@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit {

  _selectedDocs: string;


  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService) {
  }

  ngOnInit(): void {

  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  openOefiaLink(): boolean {
    openNewWindow('https://mynci.cancer.gov/topics/oefia-current-fiscal-year-funding-information', 'oefiaLink');
    return false;
  }

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


}
