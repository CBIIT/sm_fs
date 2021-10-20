import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { of, Observable } from 'rxjs';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../model/request/request-model';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from '../service/document.service';
import { HttpResponse } from '@angular/common/http';
import { saveAs } from 'file-saver';
import { NGXLogger } from 'ngx-logger';
import { BudgetInfoComponent } from '../cans/budget-info/budget-info.component';
import { WorkflowModel } from '../funding-request/workflow/workflow.model';

@Component({
  selector: 'app-upload-budget-documents',
  templateUrl: './upload-budget-documents.component.html',
  styleUrls: ['./upload-budget-documents.component.css']
})
export class UploadBudgetDocumentsComponent implements OnInit {

  selectedFiles: FileList;
  @ViewChild('inputFile')
  inputFile: ElementRef;
  @ViewChild('labelImport')
  labelImport: ElementRef;

  @ViewChild(BudgetInfoComponent) budgetInfoComponent: BudgetInfoComponent;
  @Input() requestOrPlan: 'REQUEST'|'PLAN' = 'REQUEST';

  // _workflowName: string = '';
  // disableDocType: boolean = true;

  // @Input() set workflowName(value: string) {
  //   this._workflowName = value;

  //   if (this._workflowName === 'APPROVE' ||
  //     this._workflowName === 'APPROVE_ROUTE' ||
  //     this._workflowName === 'ROUTE_APPROVE') {
  //     this.disableDocType = false;
  //   } else {
  //     this.disableDocType = true;
  //   }

  // }

  // get workflowName(): string {
  //   return this._workflowName;
  // }

  public _selectedDocType = '';
  disableFile = true;
  public docTypesStr: Array<string> = ['Interagency Agreement', 'Direct Citation Form', 'NCI Memo', 'Other Funding Document'];

  public docTypes: Observable<Array<string>> = of(this.docTypesStr);
  public _docDescription = '';
  public _docDto: DocumentsDto = {};
  maxFileSize = 10485760; // 10MB
  budgetDocDtos: Observable<DocumentsDto[]>;
  showValidations: boolean = false;
  isFileSelected: boolean = false;
  isTypeSelected: boolean = false;

  get selectedDocType(): string {
    return this._selectedDocType;
  }

  set selectedDocType(selectedDocType: string) {
    this._selectedDocType = selectedDocType;
  }

  get docDescription(): string {
    return this._docDescription;
  }

  set docDescription(docDescription: string) {
    this._docDescription = docDescription;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  constructor(private requestModel: RequestModel,
              private documentService: DocumentService,
              private logger: NGXLogger,
              private workflowModel: WorkflowModel,
              private planModel: PlanModel) {
  }

  ngOnInit(): void {

    this.loadFiles();
     
  }

  get budgetInfoReadOnly() : boolean {
    return !this.workflowModel.isFinancialApprover;
  }

  loadFiles(): void {

    if (this.requestOrPlan === 'REQUEST') {

      this.documentService.getFSBudgetFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
        result => {
          this.requestModel.requestDto.budgetDocs = result;
          this.budgetDocDtos = of(result);
          result.forEach(element => {
  
            this.spliceDocType(element.docType);
          });
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    } else {
      this.documentService.getFSBudgetFiles(this.planModel.fundingPlanDto.fprId, 'PFRP').subscribe(
        result => {
          this.planModel.fundingPlanDto.budgetDocs = result;
          this.budgetDocDtos = of(result);
          result?.forEach(element => {
  
            this.spliceDocType(element.docType);
          });
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
    
  }

  selectFiles(event): void {
    const files: FileList = event.target.files;
    this.labelImport.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.selectedFiles = event.target.files;
  }

  onDocTypeChange(event): any {
    this.logger.debug('Doc Type Change: ', event);
    this.inputFile.nativeElement.value = '';

    if (event === '') {
      this.disableFile = true;
    } else {
      this.disableFile = false;
    }
  }

  uploadFiles(): void {
    for (let i = 0; i < this.selectedFiles.length; i++) {
      this._docDto.docDescription = this.docDescription;
      this._docDto.docType = this.selectedDocType;
      
      if (this.requestOrPlan === 'REQUEST') {
        this._docDto.keyType = 'PFR';
        this._docDto.keyId = this.requestModel.requestDto.frqId;
      } else {
        this._docDto.keyType = 'PFRP';
        this._docDto.keyId = this.planModel.fundingPlanDto.fprId;
      }
      
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
          this.workflowModel.budgetDocAdded = true;
          const result = event.body;
          this.logger.debug('Upload Doc: ', result);
          this.spliceDocType(result.docType);
          this.loadFiles();
        }
      },
      err => {
        this.logger.error('Error occured while uploading doc----- ' + err.message);
      });
  }

  spliceDocType(docType: string): void {

    this.docTypes.forEach(element => {
      element.forEach((e, index) => {
        if (e === docType) {
          element.splice(index, 1);
        }
      });
    });
  }

  reset(): void {
    this.inputFile.nativeElement.value = '';
    this.labelImport.nativeElement.innerText = 'Choose file';
    this.selectedDocType = '';
    this.docDescription = '';
    this.disableFile = true;
    this.showValidations = false;
    this.isFileSelected = false;
    this.isTypeSelected = false;
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

  deleteDoc(id: number, docType: string): void {
    this.documentService.deleteDocById(id).subscribe(
      () => {
        this.logger.debug('Delete Success');
        this.loadFiles();
        this.pushDocType(docType);
      }
    ), error => {
      this.logger.error('Error while deleting the document for the docId:' + id + ' ==> ' + error);
    };

  }


  pushDocType(docType: string): void {
    let isDocTypeExists = false;
    this.docTypes.forEach(element => {
      element.forEach(e => {
        if (e === docType) {
          isDocTypeExists = true;
        }
      });
      if (!isDocTypeExists) {
        element.push(docType);
      }
    });
  }

  isFromValid(): boolean {

    this.isFileSelected = false;
    this.isTypeSelected = false;
    if (this.inputFile.nativeElement.value !== '') {
      this.isFileSelected = true;
    }
    if (this.selectedDocType !== '') {
      this.isTypeSelected = true;
    }
    if (this.isFileSelected || this.isTypeSelected) {
      this.showValidations = true;
      return false;
    }
    
    return true;
  }

}
