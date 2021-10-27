import { Component, Input, OnInit, Query, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { PlanModel } from '../../../model/plan/plan-model';
import { FpFundingSourceComponent } from '../../fp-funding-source/fp-funding-source.component';
import { FpGrantInformationComponent } from '../../fp-grant-information/fp-grant-information.component';
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

  // @ViewChild('fsEntryModal') private modalContent: TemplateRef<FundingSourceEntryModalComponent>;
  // @ViewChild('fsEntryModal') private modalComponent: FundingSourceEntryModalComponent;
  @ViewChild('modalFpFundingSource') modalFpFundingSource: FpFundingSourceComponent;
  @ViewChildren('modalFpGrantInformation') modalFpGrantInformation: QueryList<FpGrantInformationComponent>;
  @ViewChildren('modalFpRecommendedCosts') modalFpRecommendedCosts: QueryList<FpProgramRecommendedCostsComponent>;

  // private modalRef: NgbModalRef;

  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  availableFundingSources: FundingRequestFundsSrcDto[];

  constructor(
    public modal: NgbActiveModal,
    private planModel: PlanModel,
    // private modalService: NgbModal,
    private logger: NGXLogger,
    private router: Router,
    public planCoordinatorService: PlanManagementService,) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.planCoordinatorService.fundingSourceListEmitter.subscribe(next => {
      this.availableFundingSources = next;
    });
    this.planCoordinatorService.fundingSourceValuesEmitter.subscribe(next => {
      this.logger.debug(next);
    });
  }

  // open(): Promise<any> {
  //   this.logger.debug('open me');
  //   return new Promise<any>((resolve, reject) => {
  //     this.modalRef = this.modalService.open(this.modalContent, { size: 'xl' });
  //     this.modalRef.result.then(resolve, reject);
  //   });
  // }

  onModalSubmit(form: NgForm): void {
    // this.logger.debug(form);
    // this.logger.debug('--', this.modalComponent, '--');
    this.logger.debug('--', this.modalFpFundingSource, '--');
    this.logger.debug('--', this.modalFpGrantInformation, '--');
    this.logger.debug('--', this.modalFpRecommendedCosts, '--');
    if (!form.valid) {
      this.logger.error('form has errors', form);
      return;
    }
    const result: FundingSourceGrantDataPayload[] = [];
    this.logger.debug(result);
    // this.logger.debug(this.modalFpFundingSource.selectedValue);
    // this.modalRef.close();
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
        sum += +control.directCostCalculated;
      } else {
        sum += +control.directCost;
      }
    });
    return sum;
  }

  sumTotalCost(): number {
    let sum = 0;
    this.modalFpRecommendedCosts?.forEach(control => {
      if (control.displayType === 'percent') {
        sum += +control.totalCostCalculated;
      } else {
        sum += +control.totalCost;
      }
    });
    return sum;
  }
}
