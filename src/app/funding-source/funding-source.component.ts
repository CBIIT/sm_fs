import {Component, Input, OnInit} from '@angular/core';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {RequestModel} from '../model/request-model';
import {Router} from '@angular/router';
import {FsRequestControllerService} from '@nci-cbiit/i2ecws-lib';
import {Options} from 'select2';
import {FundingSourceSynchronizerService} from './funding-source-synchronizer-service';
import {openNewWindow} from '../utils/utils';
import {NGXLogger} from 'ngx-logger';
import {FundingSourceTypes} from '../model/funding-source-types';

@Component({
  selector: 'app-funding-source',
  templateUrl: './funding-source.component.html',
  styleUrls: ['./funding-source.component.css']
})
export class FundingSourceComponent implements OnInit {

  @Input() label = 'Funding Source';
  @Input() name = '';
  _selectedValue: number;
  options: Options;

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
      this.logger.debug('filter', select);
      this.selectedFundingSources.add(Number(select));
    });
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.subscribe(deselect => {
      this.logger.debug('unfilter', deselect);
      this.selectedFundingSources.delete(Number(deselect));
    });
    this.fundingSourceSynchronizerService.fundingSourceRestoreSelectionEmitter.subscribe(restore => {
      this.logger.debug('restore', restore);
      this.selectedValue = restore;
    });
    if (!this.requestModel.programRecommendedCostsModel.fundingSources
      || this.requestModel.programRecommendedCostsModel.fundingSources.length === 0) {
      this.logger.debug('loading funding sources');
      this.fsRequestControllerService.getFundingSourcesUsingGET(
        this.requestModel.requestDto.frtId,
        this.requestModel.grant.fullGrantNum,
        // TODO: Grant or current default FY?
        // this.requestModel.grant.fy,
        this.requestModel.requestDto.fy,
        // TODO: are the funding sources the ones available to the requesting pd the user selected, or the user?
        this.requestModel.requestDto.financialInfoDto.requestorNpnId,
        this.requestModel.requestDto.financialInfoDto.requestorCayCode).subscribe(result => {
        this.requestModel.programRecommendedCostsModel.fundingSources = result;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
    }
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
}
