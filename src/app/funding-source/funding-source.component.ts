import {Component, Input, OnInit} from '@angular/core';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
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
  fundingSources: Array<FundingRequestFundsSrcDto>;
  selectedFundingSources: Set<number>;
  _selectedValue: number;
  options: Options;

  get selectedValue(): number {
    return this._selectedValue;
  }

  set selectedValue(value: number) {
    if (isNumeric(this._selectedValue)) {
      this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.next(this._selectedValue);
    }
    if (isNumeric(value)) {
      this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.next(value);
    }
    this._selectedValue = value;
  }

  constructor(private requestModel: RequestModel,
              private fsRequestControllerService: FsRequestControllerService,
              private fundingSourceSynchronizerService: FundingSourceSynchronizerService,
              private router: Router) {
  }

  ngOnInit(): void {
    this.fundingSourceSynchronizerService.fundingSourceSelectionEmitter.subscribe(select => {
      console.log('select:', select);
    });
    this.fundingSourceSynchronizerService.fundingSourceDeselectionEmitter.subscribe(deselect => {
      console.log('deselect:', deselect);
    });
    this.fsRequestControllerService.getFundingSourcesUsingGET(
      this.requestModel.requestDto.frtId,
      this.requestModel.grant.fullGrantNum,
      this.requestModel.grant.fy,
      this.requestModel.requestDto.pdNpnId,
      this.requestModel.requestDto.requestorCayCode).subscribe(result => {
      console.log(result);
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
}
