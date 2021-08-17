import { HttpResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DocumentsDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
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
  selectedGrants: NciPfrGrantQueryDto[];
  exceptionGrants: NciPfrGrantQueryDto[];
  skipGrants: NciPfrGrantQueryDto[];
  private applIds: number[] = [];

  @ViewChild('collapseAll') collapseAll: ElementRef<HTMLElement>;

  get model(): PlanModel {
    return this.planModel;
  }

  constructor(private navigationModel: NavigationStepModel,
    private planModel: PlanModel,
    private documentService: DocumentService,
    private logger: NGXLogger) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(5, true);
    this.loadFiles();

    this.selectedGrants = this.planModel.allGrants.filter(g => g.selected);
    this.exceptionGrants = this.planModel.allGrants.filter(g => g.selected &&
      g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore);
    this.skipGrants = this.planModel.allGrants.filter(g => !g.selected &&
      (!g.notSelectableReason || g.notSelectableReason.length === 0) &&
      g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore
    );
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

  downloadPackage() {
    for (let i = 0; i < this.selectedGrants.length; i++) {
      this.applIds.push(this.selectedGrants[i].applId);
    }
    //TODO: remove hardcoded content once previous steps are implemented
    this.documentService.downLoadFpPackage(513,
    //this.documentService.downLoadFpPackage(this.planModel.fundingPlanDto.fprId,
      this.applIds)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'Package.pdf');
        }
      ), error =>
        this.logger.error('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

}

export enum DocTypeConstants {
  JUSTIFICATION = 'Justification',
  OTHER = 'Other',
  SKIP_JUSTIFICATION = 'SkipJustification',
  EXCEPTION_JUSTIFICATION = 'ExceptionJustification',
}
