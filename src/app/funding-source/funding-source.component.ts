import {Component, Input, OnInit} from '@angular/core';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {RequestModel} from '../model/request-model';
import {Router} from '@angular/router';
import {FsRequestControllerService} from '@nci-cbiit/i2ecws-lib';
import {Options} from 'select2';
import {isNumeric} from 'rxjs/internal-compatibility';
import {FundingSourceSynchronizerService} from './funding-source-synchronizer-service';
import {openNewWindow} from '../utils/utils';

@Component({
  selector: 'app-funding-source',
  templateUrl: './funding-source.component.html',
  styleUrls: ['./funding-source.component.css']
})
export class FundingSourceComponent implements OnInit {
  @Input() label = 'Funding Source';
  @Input() name = '';
  fundingSources: Array<FundingRequestFundsSrcDto>;
  selectedFundingSources: Set<number> = new Set<number>();
  _selectedValue: number;
  options: Options;

  get selectedValue(): number {
    return this._selectedValue;
  }

  set selectedValue(value: number) {
    const oldValue = this._selectedValue;
    this._selectedValue = value;

    if (isNumeric(oldValue)) {
      this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(oldValue);
    }
    if (isNumeric(value)) {
      this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.next(value);
    }

  }

  constructor(private requestModel: RequestModel,
              private fsRequestControllerService: FsRequestControllerService,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService,
              private router: Router) {
  }

  ngOnInit(): void {
    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.subscribe(select => {
      if (Number(select) === Number(this._selectedValue)) {
        console.log('My selection; do not exclude');
      } else {
        this.selectedFundingSources.add(Number(select));
      }

    });
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.subscribe(deselect => {
      this.selectedFundingSources.delete(Number(deselect));

    });
    this.fsRequestControllerService.getFundingSourcesUsingGET(
      this.requestModel.requestDto.frtId,
      this.requestModel.grant.fullGrantNum,
      this.requestModel.grant.fy,
      this.requestModel.requestDto.pdNpnId,
      this.requestModel.requestDto.requestorCayCode).subscribe(result => {
      this.fundingSources = result;
    }, error => {
      console.log('HttpClient get request error for----- ' + error.message);
    });
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
