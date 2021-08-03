import { Component, Input, OnInit } from '@angular/core';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { RequestModel } from '../model/request/request-model';
import { Router } from '@angular/router';
import { FsRequestControllerService } from '@nci-cbiit/i2ecws-lib';
import { Options } from 'select2';
import { FundingSourceSynchronizerService } from './funding-source-synchronizer-service';
import { openNewWindow } from '../utils/utils';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, FormGroup, NgForm } from '@angular/forms';
import { ConversionActivityCodes } from '../type4-conversion-mechanism/conversion-activity-codes';

@Component({
  selector: 'app-funding-source',
  templateUrl: './funding-source.component.html',
  styleUrls: ['./funding-source.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FundingSourceComponent implements OnInit {

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
    this.logger.debug('emitting new selection', value);
    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.next(value);
  }

  constructor(private requestModel: RequestModel,
              private fsRequestControllerService: FsRequestControllerService,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService,
              private router: Router,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.fundingSourceSynchronizerService.fundingSourceSelectionFilterEmitter.subscribe(select => {
      this.selectedFundingSources.add(Number(select));
    });
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.subscribe(deselect => {
      this.selectedFundingSources.delete(Number(deselect));
    });
    this.fundingSourceSynchronizerService.fundingSourceRestoreSelectionEmitter.subscribe(restore => {
      this.selectedValue = restore;
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
    const cayCode = this.requestModel.requestDto.financialInfoDto.requestorCayCode || this.requestModel.grant.cayCode;
    const conversionActivityCode = ConversionActivityCodes.includes(this.requestModel.requestDto.conversionActivityCode)
      ? this.requestModel.requestDto.conversionActivityCode : null;
    this.fsRequestControllerService.getFundingSourcesUsingGET(
      this.requestModel.requestDto.frtId,
      this.requestModel.grant.fullGrantNum,
      this.requestModel.requestDto.fy,
      this.requestModel.requestDto.financialInfoDto.requestorNpnId,
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
}
