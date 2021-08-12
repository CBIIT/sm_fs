import { HttpResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';


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
  planDocDtos: DocumentsDto[];
  isSciRatUploaded = false;
  isExceptionsUploaded = false;
  isSkipUploaded = false;
  isOtherUploaded = false;
  sciRatDocDto: DocumentsDto = {};
  exceptionDocDto: DocumentsDto = {};
  skipDocDto: DocumentsDto = {};
  otherDocDto: DocumentsDto = {};
  activeIds: string[] = [];

  @ViewChild('collapseAll') collapseAll: ElementRef<HTMLElement>;

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
        this.planDocDtos = result;
        this.checkUploadedDocs();

      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  reloadFiles(result: string): void {
    this.loadFiles();
    let el: HTMLElement = this.collapseAll.nativeElement;
    el.click();
  }

  checkUploadedDocs(): boolean {
    this.planDocDtos.forEach(element => {

      this.resetFlags(element.docType, true, element);

      // if (element.docType === DocTypeConstants.JUSTIFICATION) {
      //   this.isSciRatUploaded = true;
      //   this.sciRatDocDto = element;
      // }

      // if (element.docType === DocTypeConstants.OTHER) {
      //   this.isOtherUploaded = true;
      //   this.otherDocDto = element;
      // }

      // if (element.docType === DocTypeConstants.SKIP_JUSTIFICATION) {
      //   this.isSkiptUploaded = true;
      //   this.skipDocDto = element;
      // }

      // if (element.docType === DocTypeConstants.EXCEPTION_JUSTIFICATION) {
      //   this.isExceptionsUploaded = true;
      //   this.exceptionDocDto = element;
      // }

    });
    return false;
  }

  resetFlags(docType: string, upload: boolean, element: DocumentsDto) {

    if (docType === DocTypeConstants.JUSTIFICATION) {
      this.isSciRatUploaded = upload;
      this.sciRatDocDto = element;
    }

    if (docType === DocTypeConstants.OTHER) {
      this.isOtherUploaded = upload;
      this.otherDocDto = element;
    }

    if (docType === DocTypeConstants.SKIP_JUSTIFICATION) {
      this.isSkipUploaded = upload;
      this.skipDocDto = element;
    }

    if (docType === DocTypeConstants.EXCEPTION_JUSTIFICATION) {
      this.isExceptionsUploaded = upload;
      this.exceptionDocDto = element;
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

  deleteDoc(id: number, docType: string) {
    if (id !== null) {
      this.documentService.deleteDocById(id).subscribe(
        result => {
          this.logger.info('Delete Success');
          this.resetFlags(docType, false, {});
        }
      ), err => {
        this.logger.error('Error while deleting the document');
      };
    }
  }

}

export enum DocTypeConstants {
  JUSTIFICATION = 'Justification',
  OTHER = 'Other',
  SKIP_JUSTIFICATION = 'SkipJustification',
  EXCEPTION_JUSTIFICATION = 'ExceptionJustification',
}
