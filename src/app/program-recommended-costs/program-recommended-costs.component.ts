import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { AppPropertiesService } from '../service/app-properties.service';
import { FsRequestControllerService, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { GrantAwardedDto } from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {
  FundingRequestTypes,
  INITIAL_PAY_TYPES,
  PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES,
  PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES
} from '../model/request/funding-request-types';
import { FundingSourceSynchronizerService } from '../funding-source/funding-source-synchronizer-service';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { PrcBaselineSource, PrcDataPoint, PrcLineItemType } from './prc-data-point';
import { PRC_DISPLAY_FORMAT } from './program-recommended-costs-model';
import { NgForm } from '@angular/forms';
import { FundingSourceComponent } from '../funding-source/funding-source.component';
import { Alert } from '../alert-billboard/alert';
import { Select2OptionData } from 'ng-select2';

@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit, OnDestroy, AfterViewInit {
  get recommendedFutureYears(): number {
    return this._recommendedFutureYears;
  }

  set recommendedFutureYears(value: number) {
    this.logger.debug('setRecommendedFutureYears(', value, ')');
    this._recommendedFutureYears = value;
  }

  @ViewChild('prcForm', { static: false }) prcForm: NgForm;
  @ViewChild(FundingSourceComponent) fsc: FundingSourceComponent;
  alerts: Alert[] = [];
  recommendedFutureYearsData: Select2OptionData[] = [
    { id: '0', text: '0' },
    { id: '1', text: '1' },
    { id: '2', text: '2' },
    { id: '3', text: '3' },
    { id: '4', text: '4' },
    { id: '5', text: '5' }
  ];
  private _recommendedFutureYears: number;

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
  private percentCutUsed: boolean;
  private percentCutSourceId: number;
  locked: boolean;

  get dataTarget(): string {
    if (Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.PAY_TYPE_4)) {
      // return 'add-fsource-modal-pay-type4';
      return 'add-fsource-modal';
    } else {
      return 'add-fsource-modal';
    }
  }

  get isPayType4(): boolean {
    return Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.PAY_TYPE_4);
  }

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

  get currentGrantYear(): number {
    if (!!this.requestModel?.programRecommendedCostsModel?.grantAwarded) {
      return this.requestModel.programRecommendedCostsModel.grantAwarded[0].year;
    }
    return null;
  }

  constructor(
    public requestModel: RequestModel,
    private propertiesService: AppPropertiesService,
    private fsRequestControllerService: FsRequestControllerService,
    private logger: NGXLogger,
    private fundingSourceSynchronizerService: FundingSourceSynchronizerService) {
  }

  ngOnDestroy(): void {
    // this.fundingSourceSynchronizerService?.fundingSourceSelectionEmitter?.unsubscribe();
  }

  ngOnInit(): void {
    this.lineItem = [];
    this.initialPay = INITIAL_PAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
    if (this.initialPay) {
      this.showPercent = true;
      this.showDollar = false;
    } else {
      this.showDollar = true;
      this.showPercent = false;
    }
    this.loadApplAwardPeriods();

    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.subscribe(selection => {
      this.selectedSourceId = selection;
    });
    this.fundingSourceSynchronizerService.percentSelectedEmitter.subscribe(next => {
      this.logger.debug(next);
      if (next.selected) {
        this.percentCutUsed = next.selected;
        this.percentCutSourceId = next.fseId;
      } else {
        this.percentCutUsed = null;
        this.percentCutSourceId = null;
      }
    });
  }

  ngAfterViewInit(): void {
  }


  private loadApplAwardPeriods(): void {
    this.fsRequestControllerService.getApplPeriodsUsingGET(this.requestModel.grant.applId).subscribe(result => {
        this.requestModel.programRecommendedCostsModel.grantAwarded = result;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );
    // }
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

  showPiCosts(): boolean {
    return PRC_PI_REQUESTED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  showAwardedCosts(): boolean {
    return PRC_AWARDED_DIRECT_TOTAL_DISPLAY_TYPES.includes(Number(this.requestModel.requestDto.frtId));
  }

  isRestoration(): boolean {
    return Number(this.requestModel.requestDto.frtId) === Number(FundingRequestTypes.RESTORATION_OF_A_FUTURE_YEAR);
  }

  addFundingSource(): void {
    if (this.editing >= 0) {
      const edit = this.requestModel.programRecommendedCostsModel.selectedFundingSources[this.editing];
      if (this.selectedSourceId !== edit.fundingSourceId) {
        this.deleteSourceUnchecked(this.editing);
        this.editing = undefined;
        this.lineItem.forEach(l => {
          l.budgetId = undefined;
        });
      }
    } else {
      this.logger.debug('creating new budget for source', this.selectedSourceId);
    }

    if (this.requestModel.programRecommendedCostsModel.fundingSourcesMap.size === 0) {
      this.logger.error('Funding sources not initialized');
    }

    const liClone: PrcDataPoint[] = [];

    this.lineItem.forEach(l => {
      const tmp: PrcDataPoint = new PrcDataPoint();
      tmp.type = this.showDollar ? PrcLineItemType.COST_BASIS : PrcLineItemType.PERCENT_CUT;
      tmp.baselineTotal = l.baselineTotal;
      tmp.baselineDirect = l.baselineDirect;
      tmp.baselineSource = l.baselineSource;
      tmp.grantAward = l.grantAward;
      tmp.recommendedDirect = l.recommendedDirect;
      tmp.recommendedTotal = l.recommendedTotal;
      tmp.budgetId = l.budgetId;
      tmp.fundingRequestId = l.fundingRequestId;
      tmp.fundingSource = l.fundingSource;
      tmp.percentCut = l.percentCut;

      liClone.push(tmp);
      if (tmp.type === PrcLineItemType.PERCENT_CUT) {
        this.fundingSourceSynchronizerService.percentSelectedEmitter.next({
          fseId: this.selectedSourceId,
          selected: true
        });
      } else {
        if (Number(this.selectedSourceId) === Number(this.percentCutSourceId)) {
          this.logger.debug('Percent cut deselected for source', this.selectedSourceId);
          this.fundingSourceSynchronizerService.percentSelectedEmitter.next({
            fseId: this.selectedSourceId,
            selected: false
          });
        }
      }

    });

    this.requestModel.programRecommendedCostsModel.addFundingSourceById(this.selectedSourceId, liClone);
    if (this.isPayType4) {
      this.requestModel.programRecommendedCostsModel.padJaggedLineItems();
    }
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(this.selectedSourceId);
    // @ts-ignore
    $('#add-fsource-modal').modal('hide');
    this.selectedSourceId = undefined;
    this.fsc.selectedValue = undefined;
    this._recommendedFutureYears = null;
  }

  editSource(i: number): void {
    this.isPercentSelected();
    this.locked = false;
    const edit = this.requestModel.programRecommendedCostsModel.selectedFundingSources[i];
    this.lineItem = this.cloneLineItem(edit);
    this.setDisplay(this.lineItem);
    if (this.percentCutUsed && Number(edit.fundingSourceId) !== Number(this.percentCutSourceId)) {
      this.logger.warn('Percent cut already used and not by me.');
      this.locked = true;
      this.showDollar = true;
      this.showPercent = false;
    } else if (this.percentCutUsed && Number(edit.fundingSourceId) === Number(this.percentCutSourceId)) {
      this.showPercent = true;
      this.showDollar = false;

    }
    this.editing = i;
    this.logger.debug(this.lineItem, this.lineItem?.length);
    if (this.isPayType4) {
      this._recommendedFutureYears = this.lineItem?.length - 1;
    }
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(this.lineItem[0].fundingSource.fundingSourceId);
    this.fundingSourceSynchronizerService.fundingSourceRestoreSelectionEmitter.next(this.lineItem[0].fundingSource.fundingSourceId);
    // @ts-ignore
    $('#add-fsource-modal').modal('show');
  }

  private cloneLineItem(edit: FundingRequestFundsSrcDto): PrcDataPoint[] {
    const tmp: PrcDataPoint[] = this.getLineItem(edit).filter(dp => !!dp.grantAward);
    const result: PrcDataPoint[] = [];
    tmp.forEach(p => {
      const x: PrcDataPoint = new PrcDataPoint();
      x.baselineSource = p.baselineSource;
      x.baselineDirect = p.baselineDirect;
      x.baselineTotal = p.baselineTotal;
      x.fundingSource = p.fundingSource;
      x.type = p.type;
      x.budgetId = p.budgetId;
      x.fundingRequestId = p.fundingRequestId;
      x.recommendedDirect = p.recommendedDirect;
      x.recommendedTotal = p.recommendedTotal;
      x._percentCut = p.percentCut;
      x.grantAward = p.grantAward;
      result.push(x);
    });

    return result;
  }

  private setDisplay(lineItem: PrcDataPoint[]): void {
    if (lineItem?.length === 0) {
      return;
    }
    const p1 = lineItem[0];
    if (+p1.type === +PrcLineItemType.PERCENT_CUT) {
      this.showDollar = false;
      this.showPercent = true;
    } else if (+p1.type === +PrcLineItemType.COST_BASIS) {
      this.showDollar = true;
      this.showPercent = false;
    } else {
      this.logger.warn(`Can't determine display type for lineItem ${lineItem}`);
    }
  }

  toggleCostDisplay(value: string): void {
    if ('percent' === value) {
      this.showDollar = false;
      this.showPercent = true;
    } else {
      this.showDollar = true;
      this.showPercent = false;
    }
    this.resetLineItem();
  }

  resetLineItem(): void {
    if (!this.lineItem) {
      return;
    }
    if (this.showPercent) {
      const pc: number = this.lineItem[0]?.percentCut;
      if (!isNaN(pc)) {
        this.lineItem[0].percentCut = pc;
      }
    }
  }

  deleteSource(i: number): void {
    if (confirm('Are you sure you want to delete this row?')) {
      this.editing = undefined;
      const saved = !!this.requestModel.requestDto.frqId;
      const removed = this.requestModel.programRecommendedCostsModel.deleteFundingSourceByIndex(i, saved);
      this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(removed);
      this.logger.debug(removed, this.percentCutSourceId);
      if (Number(removed) === Number(this.percentCutSourceId)) {
        this.fundingSourceSynchronizerService.percentSelectedEmitter.next({ fseId: removed, selected: false });
      }
      if (this.isPayType4) {
        this.requestModel.programRecommendedCostsModel.padJaggedLineItems();
      }
    }
    this.isPercentSelected();

  }

  deleteSourceUnchecked(i: number): void {
    const saved = !!this.requestModel.requestDto.frqId;
    const removed = this.requestModel.programRecommendedCostsModel.deleteFundingSourceByIndex(i, saved);
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(removed);
  }

  prepareLineItem(): void {
    this.prcForm?.resetForm();
    this.isPercentSelected();
    this.logger.debug('prepareLineItem()--', this.percentCutUsed, '--', this.percentCutSourceId, '--');
    this.locked = false;
    if (this.percentCutUsed) {
      this.locked = true;
      this.showDollar = true;
      this.showPercent = false;
    }
    if (this.isPayType4) {
      this.lineItem = null;
      this.recommendedFutureYears = null;
      return;
    }
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
        tmp.type = PrcLineItemType.COST_BASIS;
        tmp.baselineDirect = ga.directAmount;
        tmp.baselineTotal = ga.totalAwarded;
      }
      this.lineItem.push(tmp);
    });
  }

  displayFormat(): PRC_DISPLAY_FORMAT {
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
    return this.requestModel.programRecommendedCostsModel.getLineItemsForSource(f, !this.isPayType4);
  }

  /**
   * On edit, we make the selected funding source available for selection again, so it will show up in the
   * list on the modal. If the user closes the dialog without saving, there's nothing to take it out again.
   *
   * So we will just preemptively remove any selected sources again.
   */
  cleanUpSources(): void {
    this.editing = undefined;
    this.selectedSourceId = undefined;
    this._recommendedFutureYears = null;
    this.requestModel.programRecommendedCostsModel.selectedFundingSources.forEach(s => {
      this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.next(s.fundingSourceId);
    });
    if (this.isPayType4) {
      this.requestModel.programRecommendedCostsModel.padJaggedLineItems();
    }
  }

  canSave(): boolean {
    // TODO - update this logic to handle Restoration of Future Years types
    if (!this.selectedSourceId) {
      return false;
    }
    if (!this.lineItem[0]) {
      return false;
    }
    if (this.showPercent && !this.lineItem[0].percentCut) {
      return false;
    } else if (!(this.lineItem[0].recommendedTotal && this.lineItem[0].recommendedDirect)) {
      return false;
    }
    return !((this.lineItem[0].recommendedTotal && this.lineItem[0].recommendedDirect)
      && (this.lineItem[0].recommendedTotal < this.lineItem[0].recommendedDirect));
  }

  grandTotal(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += Number(this.getLineItem(s)[i]?.recommendedTotal || 0);
    });
    return result;
  }

  grandTotalDirect(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += Number(this.getLineItem(s)[i]?.recommendedDirect || 0);
    });
    return result;
  }

  propagate(): void {
    if (this.lineItem.length > 1) {
      const first = this.lineItem[0];
      this.lineItem.forEach((li, index) => {
        if (index !== 0) {
          if (this.showPercent) {
            if (!isNaN(first.percentCut)) {
              li.recommendedDirect = first.recommendedDirect;
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
    this.alerts = [];

    if (this.prcForm.valid) {
      this.addFundingSource();
      // TODO: Clear form after successful save
    } else {
      const alert: Alert = {
        type: 'danger',
        message: 'Please correct the errors identified below.',
        title: ''
      };
      this.alerts.push(alert);
    }
  }

  get summaryRow(): number[] {
    if (this.isPayType4) {
      return this.type4FiscalYears;
    }
    return this.grantAwarded.map(g => g.year);
  }

  get type4FiscalYears(): number[] {
    const result = [];
    let max = 0;

    this.selectedFundingSources?.forEach(f => {
      const l = this.getLineItem(f)?.length || 0;
      if (l > max) {
        max = l;
      }
    });

    for (let i = 0; i < max; i++) {
      result.push(i + this.currentGrantYear);
    }

    return result;
  }

  prepareType4LineItem(): void {
    if (this.lineItem?.length > 0) {
      this.logger.warn('Replacing existing data:', this.lineItem);
    }
    this.lineItem = new Array<PrcDataPoint>();
    if (!!this._recommendedFutureYears) {
      for (let i = 0; i < Number(this._recommendedFutureYears) + 1; i++) {
        const tmp = new PrcDataPoint();
        tmp.grantAward = { year: i + this.currentGrantYear };
        this.lineItem.push(tmp);
      }
    }
  }

  isPercentSelected(): boolean {
    let result = false;
    this.requestModel.programRecommendedCostsModel?.prcLineItems?.forEach((val, key) => {
      val.forEach(p => {
        if (p.type === PrcLineItemType.PERCENT_CUT) {
          this.percentCutUsed = true;
          this.percentCutSourceId = +key;
          result = true;
        }
      });
    });
    return result;
  }
}
