import {Component, Input, OnInit} from '@angular/core';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {RequestModel} from '../model/request-model';
import {Router} from '@angular/router';
import {FsRequestControllerService} from '@nci-cbiit/i2ecws-lib';
import {Options} from 'select2';
import {FundingSourceSynchronizerService} from './funding-source-synchronizer-service';
import {openNewWindow} from '../utils/utils';
import {NGXLogger} from 'ngx-logger';

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

  // TODO: evaluate getters and setters for removal since they just pass through to underlying model anyway

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

    // TODO: FS-111
    // If request type is 30 or 1001 (Other Pay; Special Actions), and the user selects 'Moonshot Funds' (542)
    // Final LOA will be SPL committee and the final-loa section should be hidden
    // Can probably use the synchronizer service and evaluate it in the program recommended costs component.
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
        this.requestModel.grant.fy,
        this.requestModel.requestDto.pdNpnId,
        this.requestModel.requestDto.requestorCayCode).subscribe(result => {
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
