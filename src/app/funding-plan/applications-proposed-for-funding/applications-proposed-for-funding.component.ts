import { Component, EventEmitter, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { PlanManagementService } from '../service/plan-management.service';
import {
  FpProgramRecommendedCostsComponent,
  PendingPrcValues
} from '../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { Router } from '@angular/router';
import { openNewWindow } from '../../utils/utils';
import { FpGrantInformationComponent } from '../fp-grant-information/fp-grant-information.component';
import { FpFundingSourceComponent } from '../fp-funding-source/fp-funding-source.component';
import { FundingRequestFundsSrcDto } from '@cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { FundingReqBudgetsDto } from '@cbiit/i2ecws-lib';
import { FundingSourceEntryModalComponent } from './funding-source-entry-modal/funding-source-entry-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSourceGrantDataPayload } from './funding-source-grant-data-payload';
import { CustomServerLoggingService } from '../../logging/custom-server-logging-service';
import { ProgramRecommendedCostsComponent } from '../../program-recommended-costs/program-recommended-costs.component';

@Component({
  selector: 'app-applications-proposed-for-funding',
  templateUrl: './applications-proposed-for-funding.component.html',
  styleUrls: ['./applications-proposed-for-funding.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class ApplicationsProposedForFundingComponent implements OnInit {
  dummy: any;

  @Input() parentForm: NgForm;
  @Input() readOnly = false;
  @Output() beforeAddFundingSource = new EventEmitter<number>();
  @Output() beforeEditFundingSource = new EventEmitter<{ sourceId: number, index: number }>();
  @Output() addFundingSource = new EventEmitter<FundingSourceGrantDataPayload[]>();
  @Output() cancelAddFundingSource = new EventEmitter<void>();
  @Output() deleteFundingSource = new EventEmitter<number>();
  @Output() clearEditFlag = new EventEmitter<void>();
  @ViewChildren(FpProgramRecommendedCostsComponent) prcList: QueryList<FpProgramRecommendedCostsComponent>;
  @ViewChildren(FpGrantInformationComponent) grantList: QueryList<FpGrantInformationComponent>;
  @ViewChildren(FpFundingSourceComponent) fundingSources: QueryList<FpFundingSourceComponent>;

  availableFundingSources: FundingRequestFundsSrcDto[];

  comments: string;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  private _budgetMap: Map<number, Map<number, FundingReqBudgetsDto>>;
  pendingValues: PendingPrcValues;

  constructor(private logger: CustomServerLoggingService,
              public planModel: PlanModel,
              public planManagementService: PlanManagementService,
              private modalService: NgbModal,
              private router: Router) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.comments = this.planModel.fundingPlanDto.comments;
    this.planManagementService.fundingSourceListEmitter.subscribe(next => {
      this.availableFundingSources = next;
    });
    this.planManagementService.pendingValuesEmitter.subscribe(next => {
      this.capturePendingValues(next);
    });
  }

  get budgetMap(): Map<number, Map<number, FundingReqBudgetsDto>> {
    return this._budgetMap;
  }

  set budgetMap(value: Map<number, Map<number, FundingReqBudgetsDto>>) {
    this._budgetMap = value;
  }

  get listSelectedSources(): FundingRequestFundsSrcDto[] {
    return this.planManagementService.listSelectedSources;
  }

  set listSelectedSources(value: FundingRequestFundsSrcDto[]) {
    this.planManagementService.listSelectedSources = value;
  }

  get getNextSourceIndex(): number {
    // this.logger.debug('getSourceIndex():', this.planCoordinatorService.selectedSourceCount);
    if (!this.planManagementService.selectedSourceCount) {
      return 1;
    }
    return this.planManagementService.selectedSourceCount;
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
    // this.logger.debug('onAddFundingSource()', this.getNextSourceIndex);
    this.beforeAddFundingSource.next(this.getNextSourceIndex);
    if (this.getNextSourceIndex < 2) {
      this.grantList.forEach(item => {
        this.planManagementService.setRecommendedFutureYears(item.grant.applId, item.recommendedFutureYearsComponent?.selectedValue);
      });
    }

    const modalRef = this.modalService.open(FundingSourceEntryModalComponent, { size: 'xl' });
    modalRef.componentInstance.sourceIndex = this.getNextSourceIndex;
    modalRef.result.then((result) => {
      this.addFundingSource.next(result.filter(f => !!f.displayType));
      this.clearEditFlag.next();
    }, (reason) => {
      this.cancelAddFundingSource.next();
    });
  }

  canAddFundingSource(): boolean {
    if (!this.planManagementService.selectedSourceCount) {
      return !!this.fundingSources?.get(0)?.selectedValue;
    }
    return this.planManagementService.selectedSourceCount < 3;
  }

  isSingleSource(): boolean {
    return this.planManagementService.listSelectedSources?.length <= 1;
  }

  onEditFundingSource(sourceId: number, index: number): void {
    this.logger.debug(`editSource(${sourceId}, ${index})`);
    this.beforeEditFundingSource.next({ sourceId, index });
    const modalRef = this.modalService.open(FundingSourceEntryModalComponent, { size: 'xl' });
    modalRef.componentInstance.sourceIndex = index;
    modalRef.result.then((result) => {
      this.addFundingSource.next(result.filter(f => !!f.displayType));
      this.clearEditFlag.next();
    }, (reason) => {
      this.cancelAddFundingSource.next();
    });

  }

  onDeleteFundingSource(sourceId: number): void {
    // this.logger.debug('deleteSource(', sourceId, ')');
    if (confirm('Are you sure you want to delete this funding source?')) {
      this.deleteFundingSource.next(sourceId);
    }
  }

  handleSourceChanged($event: { oldSource: number; newSource: number }): void {
    // This event should only be triggered when there is a single funding source. For multiple sources, the change will
    // be spliced in.
    this.deleteFundingSource.next(+$event.oldSource);
  }

  capturePendingValues($event: PendingPrcValues): void {
    this.pendingValues = $event;
  }

  showFundingWarning(applId: number, c: FpProgramRecommendedCostsComponent): boolean {
    // this.logger.debug(this.pendingValues, this.noPendingValues(applId));
    if (c) {
      return (this.planManagementService.requestTotalTotal(applId) === 0
        && this.planManagementService.requestDirectTotal(applId) === 0 && this.noPendingValues(c.pendingValues));
    } else {
      return (this.planManagementService.requestTotalTotal(applId) === 0
        && this.planManagementService.requestDirectTotal(applId) === 0);
    }
  }

  private noPendingValues(pendingValues: PendingPrcValues): boolean {
    const reg = /^\d{0,3}(\.\d{1,2})?$/;

    if(!pendingValues) {
      return true;
    }
    // if(!(+pendingValues.applId === applId)) {
    //   return true;
    // }

    if(((pendingValues.directCost || 0) + (pendingValues.totalCost || 0) === 0) && !reg.test('' + pendingValues.percentCut)) {
      return true;
    }

    return false;
  }
}
