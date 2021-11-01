import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChildren
} from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { PlanManagementService } from '../service/plan-management.service';
import { FpProgramRecommendedCostsComponent } from '../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { Router } from '@angular/router';
import { openNewWindow } from '../../utils/utils';
import { FpGrantInformationComponent } from '../fp-grant-information/fp-grant-information.component';
import { FpFundingSourceComponent } from '../fp-funding-source/fp-funding-source.component';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { FundingReqBudgetsDto } from '@nci-cbiit/i2ecws-lib';
import { FundingSourceEntryModalComponent } from './funding-source-entry-modal/funding-source-entry-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSourceGrantDataPayload } from './funding-source-grant-data-payload';

@Component({
  selector: 'app-applications-proposed-for-funding',
  templateUrl: './applications-proposed-for-funding.component.html',
  styleUrls: ['./applications-proposed-for-funding.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class ApplicationsProposedForFundingComponent implements OnInit {

  @Input() parentForm: NgForm;
  @Input() readOnly = false;
  @Output() beforeAddFundingSource = new EventEmitter<number>();
  @Output() addFundingSource = new EventEmitter<FundingSourceGrantDataPayload[]>();
  @ViewChildren(FpProgramRecommendedCostsComponent) prcList: QueryList<FpProgramRecommendedCostsComponent>;
  @ViewChildren(FpGrantInformationComponent) grantList: QueryList<FpGrantInformationComponent>;
  @ViewChildren(FpFundingSourceComponent) fundingSources: QueryList<FpFundingSourceComponent>;

  availableFundingSources: FundingRequestFundsSrcDto[];

  comments: string;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  private _budgetMap: Map<number, Map<number, FundingReqBudgetsDto>>;

  constructor(private logger: NGXLogger,
              public planModel: PlanModel,
              public planCoordinatorService: PlanManagementService,
              private modalService: NgbModal,
              private router: Router) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.comments = this.planModel.fundingPlanDto.comments;
    this.planCoordinatorService.fundingSourceListEmitter.subscribe(next => {
      this.availableFundingSources = next;
    });
  }

  get budgetMap(): Map<number, Map<number, FundingReqBudgetsDto>> {
    return this._budgetMap;
  }

  set budgetMap(value: Map<number, Map<number, FundingReqBudgetsDto>>) {
    this._budgetMap = value;
  }

  get listSelectedSources(): FundingRequestFundsSrcDto[] {
    return this.planCoordinatorService.listSelectedSources;
  }

  set listSelectedSources(value: FundingRequestFundsSrcDto[]) {
    this.planCoordinatorService.listSelectedSources = value;
  }

  get getNextSourceIndex(): number {
    // this.logger.debug('getSourceIndex():', this.planCoordinatorService.selectedSourceCount);
    return this.planCoordinatorService.selectedSourceCount;
  }

  grantSumDirectCost(grantIndex: number): number {
    if (!this.prcList) {
      return 0;
    }
    // TODO: add index to prcList to distinguish multiple sources: prcList.filter(...).forEach(control => {
    let sum = 0;
    this.prcList.forEach(control => {
      if (control.grantIndex === grantIndex) {
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

  grantSumTotalCost(grantIndex: number): number {
    if (!this.prcList) {
      return 0;
    }
    // TODO: add index to prcList to distinguish multiple sources: prcList.filter(...).forEach(control => {
    let sum = 0;
    this.prcList.forEach(control => {
      if (control.grantIndex === grantIndex) {
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
    localStorage.setItem('fundingSources', JSON.stringify(this.availableFundingSources));
    openNewWindow(url, 'fundingSourceDetails');
    return false;
  }

  onAddFundingSource(): void {
    // TODO Check form for errors first?

    this.logger.debug('onAddFundingSource()', this.getNextSourceIndex);
    this.beforeAddFundingSource.next(this.getNextSourceIndex);
    this.grantList.forEach(item => {
      this.planCoordinatorService.setRecommendedFutureYears(item.grant.applId, item.recommendedFutureYearsComponent.selectedValue);
    });

    const modalRef = this.modalService.open(FundingSourceEntryModalComponent, {size: 'xl'});
    modalRef.componentInstance.sourceIndex = this.getNextSourceIndex;
    modalRef.result.then((result) => {
      this.logger.debug(result);
      this.addFundingSource.next(result.filter(f => !!f.displayType));
    }, (reason) => {
      this.logger.debug('closed with', reason);
    });
  }

  canAddFundingSource(): boolean {
    // At least one source provided already (and valid?)

    if(!this.parentForm.valid) {
      return false;
    }
    return this.planCoordinatorService.selectedSourceCount !== 0 && this.planCoordinatorService.selectedSourceCount < 3;
  }

  isSingleSource(): boolean {
    return this.planCoordinatorService.listSelectedSources?.length <= 1;
  }

  editSource(sourceIndex: number): void {
    this.logger.debug('editSource(', sourceIndex, ')');
  }

  deleteSource(sourceIndex: number): void {
    this.logger.debug('deleteSource(', sourceIndex, ')');
  }
}
