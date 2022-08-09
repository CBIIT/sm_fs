import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FundingRequestFundsSrcDto } from '@cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { RequestModel } from '../model/request/request-model';
import { Router } from '@angular/router';
import { FsRequestControllerService } from '@cbiit/i2ecws-lib';
import { Options } from 'select2';
import { FundingSourceSynchronizerService } from './funding-source-synchronizer-service';
import { openNewWindow } from '../utils/utils';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';
import { ConversionActivityCodes } from '../type4-conversion-mechanism/conversion-activity-codes';

@Component({
  selector: 'app-funding-source',
  templateUrl: './funding-source.component.html',
  styleUrls: ['./funding-source.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FundingSourceComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() parentForm: NgForm;

  @Input() label = 'Funding Source';
  @Input() name = 'fundingSourceComponent';
  _selectedValue: number;
  options: Options;
  private lastPd: number;
  private lastCayCode: string;

  get selectedFundingSources(): Set<number> {
    return this.requestModel.programRecommendedCostsModel.selectedFundingSourceIds;
  }

  get selectedValue(): number {
    return this._selectedValue;
  }

  get fundingSources(): Array<FundingRequestFundsSrcDto> {
    return this.requestModel.programRecommendedCostsModel.fundingSources;
  }

  set selectedValue(value: number) {
    this._selectedValue = value;
    // this.logger.debug('emitting new selection', value);
    this.logger.debug('selected sources', this.selectedFundingSources);
    this.logger.debug('available funding sources', this.availableFundingSources());

    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.next(value);
  }

  constructor(private requestModel: RequestModel,
              private fsRequestControllerService: FsRequestControllerService,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService,
              private router: Router,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.logger.debug('onInit()');
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.subscribe(select => {
      this.logger.debug(`Filtered funding source: ${select}`);
      this.selectedFundingSources.add(Number(select));
    });
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.subscribe(deselect => {
      this.logger.debug('deselecting source:', deselect);
      this.selectedFundingSources.delete(Number(deselect));
    });
    this.fundingSourceSynchronizerService.fundingSourceRestoreSelectionEmitter.subscribe(restore => {
      this.logger.debug('restoring source:', restore);
      this.selectedValue = Number(restore);
    });
    this.fundingSourceSynchronizerService.fundingSourceNewCayCodeEmitter.subscribe(next => {
      this.lastCayCode = next;
      this.refreshFundingSources();
    });
    this.fundingSourceSynchronizerService.fundingSourceNewPDEmitter.subscribe(next => {
      this.lastPd = next;
      this.refreshFundingSources();
    });
    this.refreshFundingSources();
  }

  private refreshFundingSources(): void {
    this.logger.debug(`refreshFundingSources(): selected value=${this._selectedValue}`);
    const cayCode = this.requestModel.requestDto.financialInfoDto.requestorCayCode || this.requestModel.grant.cayCode;
    const conversionActivityCode = ConversionActivityCodes.includes(this.requestModel.requestDto.conversionActivityCode)
      ? this.requestModel.requestDto.conversionActivityCode : null;
    this.fsRequestControllerService.getFundingSources(
      this.requestModel.grant.fullGrantNum,
      this.requestModel.requestDto.financialInfoDto.requestorNpnId,
      this.requestModel.requestDto.frtId,
      this.requestModel.requestDto.fy,
      cayCode,
      conversionActivityCode).subscribe(result => {
      this.requestModel.programRecommendedCostsModel.fundingSources = result;
    }, error => {
      this.logger.error('HttpClient get request error for----- ' + error.message);
    });
  }

// open the funding source help in the new window..
  openFsDetails(): boolean {
    // temporarily using # for the hashtrue file not found issue..
    const url = '/fs/#' + this.router.createUrlTree(['fundingSourceDetails']).toString();
    // storaing the funding sources details for popup window.. removing the object in the component once retrieved
    localStorage.setItem('fundingSources', JSON.stringify(this.availableFundingSources()));
    openNewWindow(url, 'fundingSourceDetails');
    return false;
  }

  availableFundingSources(): Array<FundingRequestFundsSrcDto> {
    if (!this.fundingSources) {
      return [];
    }
    return this.fundingSources.filter(f => {
      return !this.selectedFundingSources.has(Number(f.fundingSourceId));
    });
  }

  onSubmit(): void {
  }

  ngOnDestroy(): void {
    this.logger.debug('onDestroy()');
  }

  ngAfterViewInit(): void {
    this.logger.debug(`afterViewInit(): selectedValue = ${this.selectedValue}`);
  }
}
