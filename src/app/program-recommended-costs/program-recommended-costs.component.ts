import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from 'ngx-logger';
import {GrantAwardedDto} from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {
  FundingRequestTypes,
  INITIAL_PAY_TYPES,
  PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES,
  PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES
} from '../model/funding-request-types';
import {FundingSourceSynchronizerService} from '../funding-source/funding-source-synchronizer-service';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {FundingSourceTypes} from '../model/funding-source-types';
import {PrcBaselineSource, PrcDataPoint, PrcLineItemType} from './prc-data-point';
import {PRC_DISPLAY_FORMAT} from './program-recommended-costs-model';


@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit, OnDestroy, AfterViewInit {

  _selectedDocs: string;
  initialPay: boolean;
  showPercent = true;
  showDollar = false;
  _percentCut: number;
  _directCost: number;
  _totalCost: number;
  private selectedSourceId: number;
  lineItem: PrcDataPoint[];


  // Convenience method to save typing in the UI
  get selectedFundingSources(): FundingRequestFundsSrcDto[] {
    return this.requestModel.programRecommendedCostsModel.selectedFundingSources;
  }

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
    return this.requestModel.programRecommendedCostsModel.grantAwarded;
  }

  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService,
              private fsRequestControllerService: FsRequestControllerService, private logger: NGXLogger,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService) {
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.unsubscribe();
  }

  ngOnInit(): void {
    this.initialPay = INITIAL_PAY_TYPES.includes(this.requestModel.requestDto.frtId);
    this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
        this.requestModel.programRecommendedCostsModel.grantAwarded = result;
        // this.this.logger.debug('Appl Periods/Grant awards:', result);
      }, error => {
        // TODO: properly handle errors here
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );

    if (!this.requestModel.programRecommendedCostsModel.fundingSources
      || this.requestModel.programRecommendedCostsModel.fundingSources.length === 0) {
      this.logger.debug('loading funding sources');
      this.fsRequestControllerService.getFundingSourcesUsingGET(
        this.requestModel.requestDto.frtId,
        this.requestModel.grant.fullGrantNum,
        this.requestModel.grant.fy,
        this.requestModel.requestDto.pdNpnId,
        this.requestModel.requestDto.requestorCayCode).subscribe(result => {
        this.requestModel.programRecommendedCostsModel.fundingSources = result;
      }, error => {
        this.logger.debug('HttpClient get request error for----- ' + error.message);
      });
    }

    this.requestModel.programRecommendedCostsModel.fundingRequestType = this.requestModel.requestDto.frtId;

    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.subscribe(selection => {
      this.selectedSourceId = selection;
    });
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
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
    // TODO: the display will need to handle restoration of a future year
    return PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  showAwardedCosts(): boolean {
    // TODO: the display will need to handle restoration of a future year
    return PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  isRestoration(): boolean {
    return Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR);
  }

  addFundingSource(e): void {
    // TODO: Validation
    this.logger.debug('Add funding source', this.selectedSourceId);
    if (this.requestModel.programRecommendedCostsModel.fundingSourcesMap.size === 0) {
      this.logger.error('Funding sources not initialized');
    }
    // propagate changes from the line item user provided if necessary
    if (this.lineItem.length > 1) {
      const first = this.lineItem[0];
      this.lineItem.forEach((li, index) => {
        if (index !== 0) {
          if (this.showPercent) {
            li.percentCut = first.percentCut;
          } else {
            li.recommendedDirect = first.recommendedDirect;
            li.recommendedTotal = first.recommendedTotal;
          }
        }
      });
    }

    this.requestModel.programRecommendedCostsModel.addFundingSourceById(this.selectedSourceId, this.lineItem);
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(this.selectedSourceId);
    // @ts-ignore
    $('#add-fsource-modal').modal('hide');
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
    const removed = this.requestModel.programRecommendedCostsModel.deleteFundingSourceByIndex(i);
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(removed);
  }

  editSource(i: number): void {
    const edit = this.requestModel.programRecommendedCostsModel.selectedFundingSources[i];
    this.lineItem = this.getLineItem(edit);
    this.logger.debug('editing line item', this.lineItem);
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(this.lineItem[0].fundingSource.fundingSourceId);
    this.fundingSourceSynchronizerService.fundingSourceRestoreSelectionEmitter.next(this.lineItem[0].fundingSource.fundingSourceId);
    // @ts-ignore
    $('#add-fsource-modal').modal('show');
  }

  isSkipRequest(): boolean {
    return Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.SKIP) ||
      Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.SKIP__NCI_RFA);
  }

  showFinalLOA(): boolean {
    return !this.isMoonshot() && [Number(FundingRequestTypes.OTHER_PAY_COMPETING_ONLY),
      Number(FundingRequestTypes.SPECIAL_ACTIONS_ADD_FUNDS_SUPPLEMENTS)].includes(Number(this.requestModel.requestDto.frtId));
  }

  isMoonshot(): boolean {
    let result = false;
    this.requestModel.programRecommendedCostsModel.selectedFundingSources.forEach(f => {
      if (Number(f.fundingSourceId) === Number(FundingSourceTypes.MOONSHOT_FUNDS)) {
        result = true;
      }
    });
    return result;
  }


  isDiversitySupplement(): boolean {
    return Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.DIVERSITY_SUPPLEMENT_INCLUDES_CURE_SUPPLEMENTS);
  }

  isNewInvestigator(): boolean {
    return this.requestModel.grant.activityCode === 'R01' && ([1, 2].includes(Number(this.requestModel.grant.applTypeCode)));
  }

  prepareLineItem(): void {
    this.logger.debug('Prepare line item');
    this.lineItem = new Array<PrcDataPoint>();
    this.grantAwarded.forEach(ga => {
      const tmp = new PrcDataPoint();
      tmp.grantAward = ga;
      if (this.displayFormat() === PRC_DISPLAY_FORMAT.INITIAL_PAY) {
        tmp.baselineSource = PrcBaselineSource.PI_REQUESTED;
        tmp.type = PrcLineItemType.PERCENT_CUT;
        tmp.baselineDirect = ga.requestAmount;
        tmp.baselineTotal = ga.requestTotalAmount;
      } else {
        tmp.baselineSource = PrcBaselineSource.AWARDED;
        tmp.type = PrcLineItemType.PERCENT_CUT;
        tmp.baselineDirect = ga.directAmount;
        tmp.baselineTotal = ga.totalAwarded;
      }
      this.lineItem.push(tmp);
    });
    this.logger.debug(this.lineItem);
  }

  displayFormat(): PRC_DISPLAY_FORMAT {
    // TODO: Resolve display of Skip and Pay Type 4
    if (INITIAL_PAY_TYPES.includes(this.requestModel.requestDto.frtId)) {
      return PRC_DISPLAY_FORMAT.INITIAL_PAY;
    } else if (this.requestModel.requestDto.frtId === FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR) {
      return PRC_DISPLAY_FORMAT.RESTORATION_OF_FUTURE_YEAR;
    } else if (![FundingRequestTypes.SKIP, FundingRequestTypes.SKIP__NCI_RFA, FundingRequestTypes.PAY_TYPE_4]
      .includes(this.requestModel.requestDto.frtId)) {
      return PRC_DISPLAY_FORMAT.ADD_FUNDS;
    }

    return PRC_DISPLAY_FORMAT.OTHER;
  }

  getLineItem(f: FundingRequestFundsSrcDto): PrcDataPoint[] {
    return this.requestModel.programRecommendedCostsModel.getLineItemsForSource(f);
  }

  /**
   * On edit, we make the selected funding source available for selection again, so it will show up in the
   * list on the modal. If the user closes the dialog without saving, there's nothing to take it out again.
   *
   * So we will just preemptively remove any selected sources again.
   */
  cleanUpSources(): void {
    this.requestModel.programRecommendedCostsModel.selectedFundingSources.forEach(s => {
      this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(s.fundingSourceId);
    });
  }

  canSave(): boolean {
    if (!this.selectedSourceId) {
      return false;
    }
    if (!this.lineItem[0]) {
      return false;
    }
    if (this.showPercent && !this.lineItem[0].percentCut) {
      return false;
    } else if (!this.lineItem[0].recommendedTotal && !this.lineItem[0].recommendedDirect) {
      return false;
    }
    return true;
  }

  grandTotal(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += this.getLineItem(s)[i].recommendedTotal;
    });
    return result;
  }

  grandTotalDirect(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += this.getLineItem(s)[i].recommendedDirect;
    });
    return result;
  }
}
