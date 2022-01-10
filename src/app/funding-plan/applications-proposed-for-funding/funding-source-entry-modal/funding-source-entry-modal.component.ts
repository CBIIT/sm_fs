import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PlanModel } from '../../../model/plan/plan-model';
import { FpFundingSourceComponent } from '../../fp-funding-source/fp-funding-source.component';
import { FpProgramRecommendedCostsComponent } from '../../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../../model/plan/nci-pfr-grant-query-dto-ex';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { openNewWindow } from '../../../utils/utils';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { PlanManagementService } from '../../service/plan-management.service';
import { FundingSourceGrantDataPayload } from '../funding-source-grant-data-payload';

@Component({
  selector: 'app-funding-source-entry-modal',
  templateUrl: './funding-source-entry-modal.component.html',
  styleUrls: ['./funding-source-entry-modal.component.css'],
})
export class FundingSourceEntryModalComponent implements OnInit {
  @Input() title = 'Add Funding Source';
  @Input() sourceIndex = 99;

  @ViewChild('modalFpFundingSource') modalFpFundingSource: FpFundingSourceComponent;
  @ViewChildren(FpProgramRecommendedCostsComponent) modalFpRecommendedCosts: QueryList<FpProgramRecommendedCostsComponent>;

  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  availableFundingSources: FundingRequestFundsSrcDto[];

  constructor(
    public modal: NgbActiveModal,
    private planModel: PlanModel,
    private logger: NGXLogger,
    private router: Router,
    public planCoordinatorService: PlanManagementService) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.planCoordinatorService.fundingSourceListEmitter.subscribe(next => {
      this.availableFundingSources = next;
    });
  }

  onModalSubmit(form: NgForm): void {
    if (!form.valid) {
      this.logger.error('form has errors', form);
      return;
    }
    const result: FundingSourceGrantDataPayload[] = [];
    const source = this.modalFpFundingSource.sourceDetails();
    this.modalFpRecommendedCosts.forEach(control => {
      result.push({
        applId: control.grant.applId,
        directCost: control.directCost,
        directCostCalculated: control.directCostCalculated,
        supportYear: control.grant.supportYear,
        budgetId: control.budgetId, // TODO: handle for edit
        canId: control.canId, // TODO: handle for edit
        frqId: null, // TODO: handle for edit
        fseId: this.modalFpFundingSource.selectedValue,
        fundingSourceName: source.fundingSourceName,
        octId: source.octId,
        nciSourceFlag: source.nciSourceFlag,
        percentCut: control.percentCut,
        tcPercentCutCalculated: control.tcPercentCutCalculated,
        dcPercentCutCalculated: control.dcPercentCutCalculated,
        totalCost: control.totalCost,
        totalCostCalculated: control.totalCostCalculated,
        baselineDirectCost: control.baselineDirectCost,
        baselineTotalCost: control.baselineTotalCost,
        displayType: control.displayType,
        fundingSource: source
      });
    });

    this.modal.close(result);
  }

  openFsDetails(): boolean {
    // temporarily using # for the hashtrue file not found issue..
    const url = '/fs/#' + this.router.createUrlTree(['fundingSourceDetails']).toString();
    // storing the funding sources details for popup window.. removing the object in the component once retrieved
    localStorage.setItem('fundingSources', JSON.stringify(this.availableFundingSources));
    openNewWindow(url, 'fundingSourceDetails');
    return false;
  }

  sumDirectCost(): number {
    let sum = 0;
    this.modalFpRecommendedCosts?.forEach(control => {
      if (control.displayType === 'percent') {
        if (control.directCostCalculated) {
          sum += +control.directCostCalculated;
        }
      } else {
        if (control.directCost) {
          sum += +control.directCost;
        }
      }
    });
    return sum;
  }

  sumTotalCost(): number {
    let sum = 0;
    this.modalFpRecommendedCosts?.forEach(control => {
      if (control.displayType === 'percent') {
        if (control.totalCostCalculated) {
          sum += +control.totalCostCalculated;
        }
      } else {
        if (control.totalCost) {
          sum += +control.totalCost;
        }
      }
    });
    return sum;
  }
}
