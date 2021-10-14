import { HttpResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NciPfrGrantQueryDtoEx } from 'src/app/model/plan/nci-pfr-grant-query-dto-ex';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-plan-summary-statement',
  templateUrl: './plan-summary-statement.component.html',
  styleUrls: ['./plan-summary-statement.component.css']
})
export class PlanSummaryStatementComponent implements OnInit {

  private _grantList: NciPfrGrantQueryDtoEx[] = [];
  private applIds: number[] = [];

  @Input()
  set grantList(val: NciPfrGrantQueryDtoEx[]) {
    this._grantList = val;
  }

  get grantList(): NciPfrGrantQueryDtoEx[] {
    return this._grantList;
  }

  downloadSummaryStatement() {
    this.applIds = [];
    for (let i = 0; i < this.grantList.length; i++) {
      this.applIds.push(this.grantList[i].applId);
    }
    this.documentService.downloadFpSummaryStatement(this.applIds)
    // this.documentService.downloadFrqCoverSheet(this.planModel.fundingPlanDto.fprId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Summary Statement.pdf');
        }
      );
  }

  constructor(private documentService: DocumentService) { }

  ngOnInit(): void {
  }

}
