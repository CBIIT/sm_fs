import { HttpResponse } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-plan-file-upload',
  templateUrl: './plan-file-upload.component.html',
  styleUrls: ['./plan-file-upload.component.css']
})
export class PlanFileUploadComponent implements OnInit {

  selectedFiles: FileList;
  @ViewChild('inputFile') inputFile: ElementRef;
  @ViewChild('labelImport') labelImport: ElementRef;
  @Input() templateType = "Other";
  @Output() fileUploadEmitter = new EventEmitter<string>();

  public _docDto: DocumentsDto = {};
  maxFileSize = 10485760; // 10MB
  planDocDtos: Observable<DocumentsDto[]>;

  constructor(private planModel: PlanModel,
    private documentService: DocumentService,
    private logger: NGXLogger) { }

  ngOnInit(): void {
  }

  selectFiles(event): void {
    const files: FileList = event.target.files;
    this.labelImport.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.selectedFiles = event.target.files;
  }

  downloadTemplate(templateType: string) {
    //TODO: Remove the hardcoded content once previous steps are implemented
    this.documentService.downloadTemplate(513, templateType)

      //this.documentService.downloadTemplate(this.planModel.fundingPlanDto.fprId, templateTypes)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'template.doc');
        }
      );
  }

  uploadFiles(): void {
    for (let i = 0; i < this.selectedFiles.length; i++) {
      this._docDto.docType = this.getPlanDocType();
      //TODO: Remove hardcoded content
      //this._docDto.keyId = this.planModel.fundingPlanDto.fprId;
      this._docDto.keyId = 513
      this._docDto.keyType = 'PFRP';
      this._docDto.docDescription = '';
      if (this.selectedFiles[i].size <= this.maxFileSize) {
        this.upload(this.selectedFiles[i]);
      } else {
        alert('The size of the file you are attaching exceeds 10 MBs maximum file limit.');
      }
    }
    this.reset();

  }

  upload(file): void {
    this.documentService.upload(file, this._docDto).subscribe(
      event => {
        if (event instanceof HttpResponse) {
          const result = event.body;
          this.logger.debug('Upload Doc: ', result);
          this.fileUploadEmitter.emit("Emitting from child");
        }
      },
      err => {
        this.logger.error('Error occured while uploading doc----- ' + err.message);
      });
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

  getPlanDocType(): string {
    if (this.templateType === 'CR_FUNDING_PLAN_SCIENTIFIC_RPT') {
      return "Justification";
    } else if (this.templateType === 'CR_FUNDING_PLAN_EXCEPTION_JUST_RPT') {
      return "ExceptionJustification";
    } else if (this.templateType === 'CR_FUNDING_PLAN_SKIP_JUST_RPT') {
      return "SkipJustification";
    }
    return "Other";
  }

  reset(): void {
    this.inputFile.nativeElement.value = '';
    this.labelImport.nativeElement.innerText = 'Choose file';
  }

}
