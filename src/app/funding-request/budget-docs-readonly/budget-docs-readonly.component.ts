import { HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-budget-docs-readonly',
  templateUrl: './budget-docs-readonly.component.html',
  styleUrls: ['./budget-docs-readonly.component.css']
})
export class BudgetDocsReadonlyComponent implements OnInit {

  budgetDocDtos: DocumentsDto[];

  constructor(private requestModel: RequestModel,
    private documentService: DocumentService,
    private logger: NGXLogger) { }

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.documentService.getFSBudgetFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
      result => {
        this.budgetDocDtos = result;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
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

}
