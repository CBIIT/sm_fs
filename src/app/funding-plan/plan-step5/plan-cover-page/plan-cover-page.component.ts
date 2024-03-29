import { HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-plan-cover-page',
  templateUrl: './plan-cover-page.component.html',
  styleUrls: ['./plan-cover-page.component.css']
})
export class PlanCoverPageComponent implements OnInit {

  get model(): PlanModel {
    return this.planModel;
  }

  constructor(private planModel: PlanModel,
    private documentService: DocumentService) { }

  ngOnInit(): void {
  }

  downloadCoverSheet() {


    this.documentService.downloadFPCoverSheet(this.planModel.fundingPlanDto.fprId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Cover Page.pdf');
        }
      );
  }

}
