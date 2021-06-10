import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {FsRequestControllerService} from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from 'ngx-logger';
import {GrantAwardedDto} from '@nci-cbiit/i2ecws-lib/model/grantAwardedDto';
import {FundingRequestFundsSrcDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import {PrcDataPoint} from '../program-recommended-costs/prc-data-point';

@Component({
  selector: 'app-program-recommended-costs-readonly',
  templateUrl: './program-recommended-costs-readonly.component.html',
  styleUrls: ['./program-recommended-costs-readonly.component.css']
})
export class ProgramRecommendedCostsReadonlyComponent implements OnInit {
  initialPay: boolean;

  get grantAwarded(): GrantAwardedDto[] {
    return this.requestModel.programRecommendedCostsModel.grantAwarded;
  }

  get selectedFundingSources(): FundingRequestFundsSrcDto[] {
    return this.requestModel.programRecommendedCostsModel.selectedFundingSources;
  }

  constructor(private requestModel: RequestModel,
              private fsRequestControllerService: FsRequestControllerService, private logger: NGXLogger) {
  }

  ngOnInit(): void {
  }

  getLineItem(f: FundingRequestFundsSrcDto): PrcDataPoint[] {
    return this.requestModel.programRecommendedCostsModel.getLineItemsForSource(f);
  }

  showPiCosts(): boolean {
    return true;
  }

  showAwardedCosts(): boolean {
    return true;
  }

  grandTotal(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += Number(this.getLineItem(s)[i].recommendedTotal);
    });
    return result;
  }

  grandTotalDirect(i: number): number {
    let result = 0;
    this.selectedFundingSources.forEach(s => {
      result += Number(this.getLineItem(s)[i].recommendedDirect);
    });
    return result;
  }
}
