import {Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
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
import {PrcBaselineSource, PrcDataPoint, PrcLineItemType} from './prc-data-point';
import {PRC_DISPLAY_FORMAT} from './program-recommended-costs-model';
import {NgForm} from '@angular/forms';
import {FundingSourceComponent} from '../funding-source/funding-source.component';
import {Alert} from '../alert-billboard/alert';

@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit, OnDestroy {

  @ViewChild('prcForm', {static: false}) prcForm: NgForm;
  @ViewChild(FundingSourceComponent) fsc: FundingSourceComponent;
  alerts: Alert[] = [];

  _selectedDocs: string;
  initialPay: boolean;
  showPercent = true;
  showDollar = false;
  _percentCut: number;
  _directCost: number;
  _totalCost: number;
  public selectedSourceId: number;
  lineItem: PrcDataPoint[];

  private editing: number;
  @Input() readOnlyView = false;
  public modalSourceId: number;

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

  ngOnDestroy(): void {
    // this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.unsubscribe();
  }

  ngOnInit(): void {
    this.initialPay = INITIAL_PAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
    if (this.initialPay) {
      this.showPercent = true;
      this.showDollar = false;
    } else {
      this.showDollar = true;
      this.showPercent = false;
    }
    if (!this.requestModel.programRecommendedCostsModel.grantAwarded) {
      this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
          this.requestModel.programRecommendedCostsModel.grantAwarded = result;
          this.logger.debug('Appl Periods/Grant awards:', result);
        }, error => {
          // TODO: properly handle errors here
          this.logger.error('HttpClient get request error for----- ' + error.message);
        }
      );
    }

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

  addFundingSource(): void {
    // TODO: Validation
    this.logger.debug('Selected source', this.selectedSourceId);
    this.logger.debug('Editing source', this.editing);
    if (this.editing >= 0) {
      const edit = this.requestModel.programRecommendedCostsModel.selectedFundingSources[this.editing];
      this.logger.debug('Original source', edit);
      if (this.selectedSourceId !== edit.fundingSourceId) {
        this.deleteSourceUnchecked(this.editing);
        this.editing = undefined;
        this.lineItem.forEach(l => {
          l.budgetId = undefined;
        });
      }
    }
    if (this.requestModel.programRecommendedCostsModel.fundingSourcesMap.size === 0) {
      this.logger.error('Funding sources not initialized');
    }

    this.requestModel.programRecommendedCostsModel.addFundingSourceById(this.selectedSourceId, this.lineItem);
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(this.selectedSourceId);
    // @ts-ignore
    $('#add-fsource-modal').modal('hide');
    this.selectedSourceId = undefined;
    this.fsc.selectedValue = undefined;
  }

  editSource(i: number): void {
    const edit = this.requestModel.programRecommendedCostsModel.selectedFundingSources[i];
    this.editing = i;
    this.lineItem = this.getLineItem(edit);
    this.logger.debug('editing line item', this.lineItem);
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(this.lineItem[0].fundingSource.fundingSourceId);
    this.fundingSourceSynchronizerService.fundingSourceRestoreSelectionEmitter.next(this.lineItem[0].fundingSource.fundingSourceId);
    // @ts-ignore
    $('#add-fsource-modal').modal('show');
  }

  toggleCostDisplay(value: string): void {
    if ('percent' === value) {
      this.showDollar = false;
      this.showPercent = true;
    } else {
      this.showDollar = true;
      this.showPercent = false;
    }
  }

  deleteSource(i: number): void {
    if (confirm('Are you sure you want to delete this row?')) {
      const saved = this.requestModel.requestDto.frqId ? true : false;
      const removed = this.requestModel.programRecommendedCostsModel.deleteFundingSourceByIndex(i, saved);
      this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(removed);
    }
  }

  deleteSourceUnchecked(i: number): void {
    const saved = this.requestModel.requestDto.frqId ? true : false;
    const removed = this.requestModel.programRecommendedCostsModel.deleteFundingSourceByIndex(i, saved);
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(removed);
  }

  isSkipRequest(): boolean {
    return Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.SKIP) ||
      Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.SKIP__NCI_RFA);
  }

  prepareLineItem(): void {
    this.lineItem = new Array<PrcDataPoint>();
    this.grantAwarded.forEach(ga => {
      const tmp = new PrcDataPoint();
      tmp.grantAward = ga;
      if (Number(this.displayFormat()) === Number(PRC_DISPLAY_FORMAT.INITIAL_PAY)) {
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
  }

  displayFormat(): PRC_DISPLAY_FORMAT {
    // TODO: Resolve display of Skip and Pay Type 4
    if (INITIAL_PAY_TYPES.includes(Number(this.requestModel.requestDto.frtId))) {
      return PRC_DISPLAY_FORMAT.INITIAL_PAY;
    } else if (Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR)) {
      return PRC_DISPLAY_FORMAT.RESTORATION_OF_FUTURE_YEAR;
    } else if (![Number(FundingRequestTypes.SKIP), Number(FundingRequestTypes.SKIP__NCI_RFA), Number(FundingRequestTypes.PAY_TYPE_4)]
      .includes(Number(this.requestModel.requestDto.frtId))) {
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
    this.logger.debug('cleanup time');
    this.editing = undefined;
    this.selectedSourceId = undefined;
    this.requestModel.programRecommendedCostsModel.selectedFundingSources.forEach(s => {
      this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(s.fundingSourceId);
    });
  }

  canSave(): boolean {
    // TODO - update this logic to handle Restoration of Future Years types
    if (!this.selectedSourceId) {
      // this.logger.debug('no selected source');
      return false;
    }
    if (!this.lineItem[0]) {
      // this.logger.debug('no line item');
      return false;
    }
    if (this.showPercent && !this.lineItem[0].percentCut) {
      // this.logger.debug('no percent cut');
      return false;
    } else if (!(this.lineItem[0].recommendedTotal && this.lineItem[0].recommendedDirect)) {
      // this.logger.debug('missing recommended direct or total');
      return false;
    }
    if ((this.lineItem[0].recommendedTotal && this.lineItem[0].recommendedDirect)
      && (this.lineItem[0].recommendedTotal < this.lineItem[0].recommendedDirect)) {
      return false;
    }
    return true;
  }

  grandTotal(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += Number(this.getLineItem(s)[i].recommendedTotal || 0);
    });
    return result;
  }

  grandTotalDirect(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += Number(this.getLineItem(s)[i].recommendedDirect || 0);
    });
    return result;
  }

  propagate(): void {
    this.logger.debug('Propagating:', this.lineItem);
    if (this.lineItem.length > 1) {
      const first = this.lineItem[0];
      this.lineItem.forEach((li, index) => {
        if (index !== 0) {
          if (this.showPercent) {
            if (!isNaN(first.percentCut)) {
              li.percentCut = first.percentCut;
            }
          } else {
            if (!isNaN(first.recommendedDirect)) {
              li.recommendedDirect = first.recommendedDirect;
            }
          }
        }
      });
    }
  }

  onSubmit(): void {
    this.logger.debug(this.prcForm);
    this.alerts = [];

    if (this.prcForm.valid) {
      this.addFundingSource();
      // TODO: Clear form after successful save
      // this.prcForm.reset();
      for (const name in this.prcForm.controls) {
        this.logger.debug('control:', name, this.prcForm.controls[name]);
      }
      // this.logger.debug('resetting form');
      // this.prcForm.reset();
      // for (const name in this.prcForm.controls) {
      //   this.logger.debug('control:', name, this.prcForm.controls[name]);
      // }
    } else {
      const alert: Alert = {
        type: 'danger',
        message: 'Please correct all errors below before continuing',
        title: ''
      };
      this.alerts.push(alert);
    }
  }
}
