import { Component, OnInit} from '@angular/core';
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

  constructor(private navigationModel: NavigationStepModel,
    private planModel: PlanModel,
    private documentService: DocumentService) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(5, true);
  }


}
