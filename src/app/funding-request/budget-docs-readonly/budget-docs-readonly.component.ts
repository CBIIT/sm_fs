import { HttpResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { DocumentsDto } from '@cbiit/i2ecommonws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';
import { Step4Component } from '../step4/step4.component';
import { Subscription } from 'rxjs';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { FundingRequestIntegrationService } from '../integration/integration.service';

@Component({
  selector: 'app-budget-docs-readonly',
  templateUrl: './budget-docs-readonly.component.html',
  styleUrls: ['./budget-docs-readonly.component.css']
})
export class BudgetDocsReadonlyComponent implements OnInit {

  private _parent: Step4Component;
  @Input() set parent(value: Step4Component) {
    this._parent = value;
  }

  get parent(): Step4Component {
    return this._parent;
  }

  requestSubmissionEventSubscriber: Subscription;
  @Input() requestOrPlan: 'REQUEST' | 'PLAN' = 'REQUEST';

  constructor(private requestModel: RequestModel,
    private documentService: DocumentService,
    private logger: NGXLogger,
    private requestIntegrationService: FundingRequestIntegrationService,
    private planModel: PlanModel) { }

  ngOnInit(): void {
    this.loadFiles();
    this.requestSubmissionEventSubscriber = this.requestIntegrationService.requestSubmissionEmitter.subscribe(
      () => { this.loadFiles(); }
    );
  }



  loadFiles(): void {

    if (this.requestOrPlan === 'REQUEST') {

      this.documentService.getFSBudgetFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
        result => {
          this.requestModel.requestDto.budgetDocs = result;
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    } else {
      this.documentService.getFSBudgetFiles(this.planModel.fundingPlanDto.fprId, 'PFRP').subscribe(
        result => {
          this.planModel.fundingPlanDto.budgetDocs = result;
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }

  }

  downloadFile(id: number, fileName: string): void {

    this.documentService.downloadById(id)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, fileName);
        }
      );

  }

  get budgetDocDtos(): DocumentsDto[] {
    if (this.requestOrPlan === 'REQUEST') {
      return this.requestModel.requestDto.budgetDocs;
    } else {
      return this.planModel.fundingPlanDto.budgetDocs;
    }

  }

}
