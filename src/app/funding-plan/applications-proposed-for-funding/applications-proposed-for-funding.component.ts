import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';
import { FpProgramRecommendedCostsComponent } from '../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { Router } from '@angular/router';
import { openNewWindow } from '../../utils/utils';
import { FpGrantInformationComponent } from '../fp-grant-information/fp-grant-information.component';
import { FpFundingSourceComponent } from '../fp-funding-source/fp-funding-source.component';

@Component({
  selector: 'app-applications-proposed-for-funding',
  templateUrl: './applications-proposed-for-funding.component.html',
  styleUrls: ['./applications-proposed-for-funding.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class ApplicationsProposedForFundingComponent implements OnInit {
  @Input() parentForm: NgForm;
  @Input() readOnly = false;
  @ViewChildren(FpProgramRecommendedCostsComponent) prcList: QueryList<FpProgramRecommendedCostsComponent>;
  @ViewChildren(FpGrantInformationComponent) grantList: QueryList<FpGrantInformationComponent>;
  @ViewChildren(FpFundingSourceComponent) fundingSources: QueryList<FpFundingSourceComponent>;
  @ViewChild('modalFpFundingSource') modalFpFundingSource: FpFundingSourceComponent;
  @ViewChild('modalFpGrantInformation') modalFpGrantInformation: FpGrantInformationComponent;
  @ViewChild('modalFpRecommendedCosts') modalFpRecommendedCosts: FpProgramRecommendedCostsComponent;

  comments: string;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  listSelectedSources: string[];

  get sourceIndex(): number {
    this.logger.debug('getSourceIndex():', this.planCoordinatorService.selectedSourceCount);
    return this.planCoordinatorService.selectedSourceCount;
  }

  grantSumDirectCost(): number {
    return 0;
  }

  grantSumTotalCost(): number {
    return 0;
  }

  sourceSumDirectCost(sourceIndex: number): number {
    if (!this.prcList) {
      return 0;
    }
    // TODO: add index to prcList to distinguish multiple sources: prcList.filter(...).forEach(control => {
    let sum = 0;
    this.prcList.forEach(control => {
      if (control.sourceIndex === sourceIndex) {
        if (control.displayType === 'percent') {
          if (!isNaN(control.directCostCalculated)) {
            sum = sum + Number(control.directCostCalculated);
          }
        } else {
          if (!isNaN(control.directCost)) {
            sum = sum + Number(control.directCost);
          }
        }
      }
    });
    return sum;
  }

  sourceSumTotalCost(sourceIndex: number): number {
    if (!this.prcList) {
      return 0;
    }
    // TODO: add index to prcList to distinguish multiple sources: prcList.filter(...).forEach(control => {
    let sum = 0;
    this.prcList.forEach(control => {
      if (control.sourceIndex === sourceIndex) {
        if (control.displayType === 'percent') {
          if (!isNaN(control.totalCostCalculated)) {
            sum = sum + Number(control.totalCostCalculated);
          }
        } else {
          if (!isNaN(control.totalCost)) {
            sum = sum + Number(control.totalCost);
          }
        }
      }
    });

    return sum;
  }

  // open the funding source help in the new window..
  openFsDetails(): boolean {
    // temporarily using # for the hashtrue file not found issue..
    const url = '/fs/#' + this.router.createUrlTree(['fundingSourceDetails']).toString();
    // storing the funding sources details for popup window.. removing the object in the component once retrieved
    localStorage.setItem('fundingSources', JSON.stringify(this.availableFundingSources()));
    openNewWindow(url, 'fundingSourceDetails');
    return false;
  }

  availableFundingSources(): void {
    /*if (!this.fundingSources) {
      return [];
    }
    return this.fundingSources.filter(f => {
      return !this.selectedFundingSources.has(Number(f.fundingSourceId));
    });*/
    return null;
  }

  constructor(private logger: NGXLogger, private planModel: PlanModel,
              private planCoordinatorService: PlanCoordinatorService,
              private router: Router) {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

  }

  ngOnInit(): void {

  }

  onModalSubmit($event: any): void {
    this.logger.debug('submit: ', $event, this.parentForm);
    this.logger.debug(this.modalFpFundingSource, this.modalFpRecommendedCosts);
  }

  onAddFundingSource(): void {
    this.logger.debug('onAddFundingSource()', this.sourceIndex);
    this.modalFpFundingSource.index = this.sourceIndex;
    this.modalFpFundingSource.filterData();
    this.modalFpRecommendedCosts.sourceIndex = this.sourceIndex;
    this.modalFpGrantInformation.sourceIndex = this.sourceIndex;
  }

  canAddFundingSource(): boolean {
    // At least one source provided already (and valid?)

    return this.planCoordinatorService.selectedSourceCount !== 0 && this.planCoordinatorService.selectedSourceCount < 3;
  }
}
