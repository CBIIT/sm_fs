import { Component, Input, OnInit } from '@angular/core';
import { FsCanControllerService, FundingRequestCanDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request-model';
import { WorkflowModel } from '../workflow.model';

@Component({
  selector: 'app-approved-costs',
  templateUrl: './approved-costs.component.html',
  styleUrls: ['./approved-costs.component.css']
})
export class ApprovedCostsComponent implements OnInit {
  @Input() approvingState = false;

  cans: FundingRequestCanDto[];

  constructor(private canControllerService: FsCanControllerService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    setTimeout(this.loadData.bind(this), 1000);
  }

  loadData(): void {
      this.canControllerService.getRequestCansUsingGET(this.requestModel.requestDto.frqId).subscribe(
      result => {
        if (result && result.length > 0) {
          this.cans = result;
          this.logger.debug('f_r_can_t from db ', this.cans);
        }
        else {
          this.cans = [];
          const programCostModel = this.requestModel.programRecommendedCostsModel;
          this.logger.debug('Program Cost Model ', programCostModel);
          for (const fs of programCostModel.selectedFundingSources) {
            const lineItems = programCostModel.getLineItemsForSourceId(fs.fundingSourceId);
            if (lineItems.length > 0) {
              const lineItem0 = lineItems[0];
              const dto: FundingRequestCanDto = {};
              dto.frqId = this.requestModel.requestDto.frqId;
              dto.fseId = fs.fundingSourceId;
              dto.fundingSourceName = fs.fundingSourceName;
              dto.requestedTc = lineItem0.recommendedTotal;
              dto.requestedDc = lineItem0.recommendedDirect;
              dto.approvedTc = dto.requestedTc;
              dto.approvedPctCut = lineItem0.percentCutTotalCalculated;
              dto.requestedFutureYrs = lineItems.filter( li => li.recommendedTotal > 0).length - 1;
              dto.approvedFutureYrs = dto.requestedFutureYrs;
              this.cans.push(dto);
            }
          }
          this.logger.debug('built f_r_can_t from program_cost_model ', this.cans);
        }
      },
      error => {
        this.logger.error('get request cans failed', error);
      }
    );
  }

  getCans(): FundingRequestCanDto[] {
    return this.cans;
  }

  get editable(): boolean {
    return this.workflowModel.isScientificApprover && this.approvingState;
  }

}
