import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { PlanModel } from '../../../model/plan/plan-model';
import { FpFundingSourceComponent } from '../../fp-funding-source/fp-funding-source.component';
import { FpGrantInformationComponent } from '../../fp-grant-information/fp-grant-information.component';
import { FpProgramRecommendedCostsComponent } from '../../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { openNewWindow } from '../../../utils/utils';
import { FundingRequestFundsSrcDto } from '@nci-cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto';
import { PlanManagementService } from '../../service/plan-management.service';

@Component({
  selector: 'app-funding-source-entry-modal',
  templateUrl: './funding-source-entry-modal.component.html',
  styleUrls: ['./funding-source-entry-modal.component.css'],
})
export class FundingSourceEntryModalComponent implements OnInit {
  @Input() title = 'Add Funding Source';

  @ViewChild('fsEntryModal') private modalContent: TemplateRef<FundingSourceEntryModalComponent>;
  private modalRef: NgbModalRef;

  @ViewChild('modalFpFundingSource') modalFpFundingSource: FpFundingSourceComponent;
  @ViewChild('modalFpGrantInformation') modalFpGrantInformation: FpGrantInformationComponent;
  @ViewChild('modalFpRecommendedCosts') modalFpRecommendedCosts: FpProgramRecommendedCostsComponent;

  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  availableFundingSources: FundingRequestFundsSrcDto[];

  constructor(
    private planModel: PlanModel,
    private modalService: NgbModal,
    private logger: NGXLogger,
    private router: Router,
    public planCoordinatorService: PlanManagementService,) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);
    this.planCoordinatorService.fundingSourceListEmitter.subscribe(next => {
      this.availableFundingSources = next;
    });

  }

  open(): Promise<any> {
    this.logger.debug('open me');
    return new Promise<any>( (resolve, reject) => {
      this.modalRef = this.modalService.open(this.modalContent, { size: 'xl' });
      this.modalRef.result.then(resolve, reject);
    });
  }

  onModalSubmit(): void {
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
    return 1000000;
  }

  sumTotalCost(): number {
    return 1000000;
  }
}
