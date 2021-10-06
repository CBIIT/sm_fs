import { Component, OnInit } from '@angular/core';
import { DocumentsDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';
import { NGXLogger } from 'ngx-logger';
import { HttpResponse } from '@angular/common/http';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-plan-supporting-docs-readonly',
  templateUrl: './plan-supporting-docs-readonly.component.html',
  styleUrls: ['./plan-supporting-docs-readonly.component.css']
})
export class PlanSupportingDocsReadonlyComponent implements OnInit {


  selectedGrants: NciPfrGrantQueryDto[];
  exceptionGrants: NciPfrGrantQueryDto[];
  skipGrants: NciPfrGrantQueryDto[];
  planDocDtos: DocumentsDto[];
  isSciRatUploaded = false;
  isExceptionsUploaded = false;
  isSkipUploaded = false;
  isOtherUploaded = false;
  sciRatDocDto: DocumentsDto = {};
  exceptionDocDto: DocumentsDto = {};
  skipDocDto: DocumentsDto = {};
  otherDocDto: DocumentsDto = {};
  private applIds: number[] = [];



  constructor(private planModel: PlanModel,
    private documentService: DocumentService,
    private logger: NGXLogger) { }

  ngOnInit(): void {
    this.loadFiles();

    this.selectedGrants = this.planModel.allGrants.filter(g => g.selected);
    this.exceptionGrants = this.planModel.allGrants.filter(g => g.selected &&
      (g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore));
    this.skipGrants = this.planModel.allGrants.filter(g => !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
      g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore
    );
  }

  loadFiles(): void {

    this.planDocDtos = this.planModel.fundingPlanDto.documents;
    this.checkUploadedDocs();

  }

  checkUploadedDocs(): boolean {

    if (this.planDocDtos !== null) {
      this.planDocDtos.forEach(element => {
        this.resetFlags(element.docType, true, element);
      });
    }

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

  downloadPackage() {
    for (let i = 0; i < this.selectedGrants.length; i++) {
      this.applIds.push(this.selectedGrants[i].applId);
    }
    this.documentService.downLoadFpPackage(this.planModel.fundingPlanDto.fprId,
      this.applIds)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Package.pdf');
        }
      ), error =>
        this.logger.error('Error downloading the file'),
      () => this.logger.info('File downloaded successfully');
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

  downloadFile(id: number, fileName: string): void {

    this.documentService.downloadById(id)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, fileName);
        }
      );
  }

  downloadSummaryStatement() {
    for (let i = 0; i < this.selectedGrants.length; i++) {
      this.applIds.push(this.selectedGrants[i].applId);
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

}

export enum DocTypeConstants {
  JUSTIFICATION = 'Justification',
  OTHER = 'Other',
  SKIP_JUSTIFICATION = 'SkipJustification',
  EXCEPTION_JUSTIFICATION = 'ExceptionJustification',
}
