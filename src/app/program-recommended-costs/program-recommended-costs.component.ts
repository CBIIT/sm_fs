import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {getDisplayCategory, openNewWindow} from 'src/app/utils/utils';
import {NGXLogger} from 'ngx-logger';
import {FundingRequestValidationService} from '../model/funding-request-validation-service';
import {FundingRequestErrorCodes} from '../model/funding-request-error-codes';
import {GrantAwardedDto} from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES, PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES} from '../model/funding-request-types';


@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit {

  _selectedDocs: string;
  displayCategory: number;

  get grantAwarded(): Array<GrantAwardedDto> {
    return this.requestModel.requestDto.grantAwarded;
  }

  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService, private logger: NGXLogger,
              private fundingRequestValidationService: FundingRequestValidationService) {
  }

  ngOnInit(): void {
    this.displayCategory = getDisplayCategory(this.requestModel.requestDto.frtId);
    this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
        this.requestModel.requestDto.grantAwarded = result;
        this.logger.debug('Appl Periods/Grant awards:', result);
        this.requestModel.initializeProgramRecommendedCosts();
      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );

    this.fundingRequestValidationService.raiseError.subscribe(e => {
      this.showError(e);
    });
    this.fundingRequestValidationService.resolveError.subscribe(e => {
      this.clearError(e);
    });
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

  private showError(e: FundingRequestErrorCodes): void {
    // this.logger.info('handling error code', e);
  }

  private clearError(e: FundingRequestErrorCodes): void {
    // this.logger.info('clear error code', e);
  }

  showPiCosts(): boolean {
    this.logger.debug('Request Type:', this.requestModel.requestDto.frtId);
    this.logger.debug('Parent Request Type:', this.requestModel.requestDto.parentFrtId);
    return PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  showAwardedCosts(): boolean {
    return PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }
}
