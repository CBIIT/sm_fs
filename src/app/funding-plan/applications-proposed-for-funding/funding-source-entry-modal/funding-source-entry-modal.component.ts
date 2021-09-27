import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { PlanModel } from '../../../model/plan/plan-model';
import { FpFundingSourceComponent } from '../../fp-funding-source/fp-funding-source.component';
import { FpGrantInformationComponent } from '../../fp-grant-information/fp-grant-information.component';
import { FpProgramRecommendedCostsComponent } from '../../fp-program-recommended-costs/fp-program-recommended-costs.component';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';

@Component({
  selector: 'app-funding-source-entry-modal',
  templateUrl: './funding-source-entry-modal.component.html',
  styleUrls: ['./funding-source-entry-modal.component.css'],
  // viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]

})
export class FundingSourceEntryModalComponent implements OnInit {
  @Input() title = 'Add Funding Source';

  @ViewChild('fsEntryModal') private modalContent: TemplateRef<FundingSourceEntryModalComponent>;
  private modalRef: NgbModalRef;

  @ViewChild('modalFpFundingSource') modalFpFundingSource: FpFundingSourceComponent;
  @ViewChild('modalFpGrantInformation') modalFpGrantInformation: FpGrantInformationComponent;
  @ViewChild('modalFpRecommendedCosts') modalFpRecommendedCosts: FpProgramRecommendedCostsComponent;

  listGrantsSelected: NciPfrGrantQueryDtoEx[];

  constructor(
    private planModel: PlanModel,
    private modalService: NgbModal,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

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

  openFsDetails(): void {

  }

  sumDirectCost(): number {
    return 1000000;
  }

  sumTotalCost(): number {
    return 1000000;
  }
}