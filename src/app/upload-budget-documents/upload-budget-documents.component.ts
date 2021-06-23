import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { of, Observable } from 'rxjs';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../model/request-model';
import { DocumentService } from '../service/document.service';
import { HttpResponse } from '@angular/common/http';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-upload-budget-documents',
  templateUrl: './upload-budget-documents.component.html',
  styleUrls: ['./upload-budget-documents.component.css']
})
export class UploadBudgetDocumentsComponent implements OnInit {

  selectedFiles: FileList;
  @ViewChild('inputFile')
  inputFile: ElementRef;

  public _selectedDocType: string = '';
  disableFile: boolean = true;
  public docTypesStr: Array<string> = ['Interagency Agreement', 'Direct Citation Form', 'NCI Memo', 'Other Funding Document'];;
  public docTypes: Observable<Array<string>> = of(this.docTypesStr);
  public _docDescription: string = '';
  public _docDto: DocumentsDto = {};
  maxFileSize: number = 10485760; //10MB
  budgetDocDtos: Observable<DocumentsDto[]>;


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
    private documentService: DocumentService,) { }

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles() {
    this.documentService.getFSBudgetFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
      result => {
        this.budgetDocDtos = of(result);
        result.forEach(element => {

          this.spliceDocType(element.docType);
        });
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
  }

  selectFiles(event): void {
    this.selectedFiles = event.target.files;
  }

  onDocTypeChange(event): any {
    console.log('Doc Type Change: ', event);
    this.inputFile.nativeElement.value = ''

    if (event === '') {
      this.disableFile = true;
    } else {
      this.disableFile = false;
    }
  }

  uploadFiles() {
    for (let i = 0; i < this.selectedFiles.length; i++) {
      this._docDto.docDescription = this.docDescription;
      this._docDto.docType = this.selectedDocType;
      this._docDto.keyId = this.requestModel.requestDto.frqId;
      this._docDto.keyType = 'PFR';
      if (this.selectedFiles[i].size <= this.maxFileSize) {
        this.upload(this.selectedFiles[i]);
      } else {
        alert('The size of the file you are attaching exceeds 10 MBs maximum file limit.');
      }

    }
    this.reset();

  }

  upload(file) {
    this.documentService.upload(file, this._docDto).subscribe(
      event => {
        if (event instanceof HttpResponse) {

          const result = event.body;
          console.log('Upload Doc: ', result);
          this.spliceDocType(result.docType);
          this.loadFiles();
        }
      },
      err => {
        console.log('Error occured while uploading doc----- ' + err.message);
      });
  }

  spliceDocType(docType: string) {

    this.docTypes.forEach(element => {
      element.forEach((e, index) => {
        if (e === docType) {
          element.splice(index, 1);
        }
      });
    });
  }

  reset() {
    this.inputFile.nativeElement.value = '';
    this.selectedDocType = '';
    this.docDescription = '';
    this.disableFile = false;


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
    this.documentService.deleteDocById(id).subscribe(
      result => {
        console.log('Delete Success');
        this.loadFiles();
        this.pushDocType(docType);
      }
    ), err => {
      console.log('Error while deleting the document');
    };

  }


  pushDocType(docType: string) {
    var isDocTypeExists: boolean = false;
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

}
