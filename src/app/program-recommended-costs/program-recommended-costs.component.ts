import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {openNewWindow} from 'src/app/utils/utils';
import {NGXLogger} from 'ngx-logger';
import {GrantAwardedDto} from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {
  INITIAL_PAY_TYPES,
  PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES,
  PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES
} from '../model/funding-request-types';
import {FundingSourceSynchronizerService} from '../funding-source/funding-source-synchronizer-service';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';


@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit, OnDestroy, AfterViewInit {

  _selectedDocs: string;
  displayCategory: number;
  selectedFundingSources = new Array<FundingRequestFundsSrcDto>();
  initialPay: boolean;
  showPercent = true;
  showDollar = false;
  _percentCut: number;
  _directCost: number;
  _totalCost: number;
  directPercentCutCalculated: number = 0.04;
  totalPercentCutCalculated: number = 0.03;
  private selectedSource: number;
  private allFundingSources = new Map<number, FundingRequestFundsSrcDto>();

  get directCost(): number {
    return this._directCost;
  }

  set directCost(val: number) {
    this._directCost = val;
  }

  get totalCost(): number {
    return this._totalCost;
  }

  set totalCost(val: number) {
    this._totalCost = val;
  }

  set percentCut(pc: number) {
    this._percentCut = pc;
    this.logger.debug('percent cut:', pc);
  }

  get percentCut(): number {
    return this._percentCut;
  }

  get grantAwarded(): Array<GrantAwardedDto> {
    return this.requestModel.requestDto.grantAwarded;
  }

  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService, private logger: NGXLogger,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService) {
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.unsubscribe();
  }

  ngOnInit(): void {
    // this.fundingSources = new Array<any>(3);
    // this.displayCategory = getDisplayCategory(this.requestModel.requestDto.frtId);
    this.initialPay = INITIAL_PAY_TYPES.includes(this.requestModel.requestDto.frtId);
    this.logger.debug('Display category:', this.displayCategory);
    this.logger.debug('Initial pay     :', this.initialPay);
    this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
        this.requestModel.requestDto.grantAwarded = result;
        // this.this.logger.debug('Appl Periods/Grant awards:', result);
        this.requestModel.initializeProgramRecommendedCosts();
      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );

    this.fsRequestControllerService.getFundingSourcesUsingGET(
      this.requestModel.requestDto.frtId,
      this.requestModel.grant.fullGrantNum,
      this.requestModel.grant.fy,
      this.requestModel.requestDto.pdNpnId,
      this.requestModel.requestDto.requestorCayCode).subscribe(result => {
      this.requestModel.fundingSources = result;
      this.allFundingSources = new Map(result.map(key => [key.fundingSourceId, key] as [number, FundingRequestFundsSrcDto]));
      this.logger.debug(this.requestModel.fundingSources);
      this.logger.debug(this.allFundingSources);
    }, error => {
      this.logger.debug('HttpClient get request error for----- ' + error.message);
    });

    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.subscribe(selection => {
      this.selectedSource = selection;
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

  showPiCosts(): boolean {
    return PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  showAwardedCosts(): boolean {
    return PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  addFundingSource(e): void {
    this.logger.debug('add funding source', this.selectedSource);
    if (this.allFundingSources.size === 0) {
      this.logger.error('funding sources not initialized');
      this.requestModel.fundingSources.forEach(s => {
        this.allFundingSources.set(s.fundingSourceId, s);
      });
    }
    this.selectedFundingSources.push(this.allFundingSources.get(Number(this.selectedSource)));
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(this.selectedSource);
    // @ts-ignore
    $('#add-fsource-modal').modal('hide');
    // validation here
  }

  toggleCostDisplay(value: string): void {
    this.logger.debug('radio selected:', value);
    if ('percent' === value) {
      this.showDollar = false;
      this.showPercent = true;
    } else {
      this.showDollar = true;
      this.showPercent = false;
    }
  }

  deleteSource(i: number): void {
    const removed = this.selectedFundingSources[i];
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(removed.fundingSourceId);
    this.selectedFundingSources.splice(i, 1);
  }

  editSource(i: number): void {
  }
}
