import { Component, OnInit } from '@angular/core';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Observable, of } from 'rxjs';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';


@Component({
  selector: 'app-plan-step5',
  templateUrl: './plan-step5.component.html',
  styleUrls: ['./plan-step5.component.css']
})
export class PlanStep5Component implements OnInit {

  CR_FUNDING_PLAN_SCIENTIFIC_RPT = "CR_FUNDING_PLAN_SCIENTIFIC_RPT";
  CR_FUNDING_PLAN_EXCEPTION_JUST_RPT = "CR_FUNDING_PLAN_EXCEPTION_JUST_RPT";
  CR_FUNDING_PLAN_SKIP_JUST_RPT = "CR_FUNDING_PLAN_SKIP_JUST_RPT";
  Other = "Other";
  planDocDtos: Observable<DocumentsDto[]>;

  constructor(private navigationModel: NavigationStepModel,
    private planModel: PlanModel,
    private documentService: DocumentService,
    private logger: NGXLogger) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(5, true);

    this.loadFiles();
  }

  loadFiles(): void {
    //TODO: remove hardcoded content and use the appropriate endpoint
    this.documentService.getFiles(513, 'PFRP').subscribe(
      //this.documentService.getFSBudgetFiles(this.planModel.fundingPlanDto.fprId, 'PFRP').subscribe(
      result => {
        this.planDocDtos = of(result);

      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  reloadFiles(result: string): void {
    this.loadFiles();
  }


}
