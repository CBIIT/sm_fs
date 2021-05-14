import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import 'select2';
import { Options } from 'select2';
import { CgRefCodControllerService, CgRefCodesDto, DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { DocumentService } from '../../service/document.service';
import { RequestModel } from '../../model/request-model';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { saveAs } from 'file-saver';
import { of, Observable } from 'rxjs';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface Swimlane {
  name: string;
  array: DocumentsDto[];
}

@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
  styleUrls: ['./step3.component.css']
})
export class Step3Component implements OnInit {


  public items: DocumentsDto[];
  itemsExcluded: DocumentsDto[] = [];
  public DocTypes: Array<CgRefCodesDto>;
  public options: Options;
  public _selectedDocType: string = '';
  public _docDescription: string = '';


  baseTaskList: Observable<DocumentsDto[]>;
  include: Observable<DocumentsDto[]>;
  exclude: Observable<DocumentsDto[]>;

  swimlanes: Swimlane[] = [];

  selectedFiles: FileList;
  fileInfos: Observable<DocumentsDto[]>;


  get model(): RequestModel {
    return this.requestModel;
  }


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


  selectFiles(event) {
    this.selectedFiles = event.target.files;
  }

  public _docDto: DocumentsDto = {};

  uploadFiles() {
    for (let i = 0; i < this.selectedFiles.length; i++) {
      this._docDto.docDescription = this.docDescription;
      this._docDto.docType = this.selectedDocType;
      this._docDto.keyId = 1; //TODO: Get this ID from step 2 once implemented
      this._docDto.keyType = 'PFR';
      this.upload(this.selectedFiles[i], this._docDto);
    }
  }

  upload(file, DocumentsDto) {
    this.documentService.upload(file, this._docDto).subscribe(
      event => {
        if (event.type === HttpEventType.UploadProgress) {

        } else if (event instanceof HttpResponse) {

          this.fileInfos = this.documentService.getFiles(this._docDto.keyId, 'PFR');
        }
      },
      err => {
        console.log("error occured while uploading a document");
        this.fileInfos = this.documentService.getFiles(this._docDto.keyId, 'PFR');

        this.documentService.getLatestFile(this._docDto.keyId, 'PFR').subscribe(
          result => {
            console.log('Getting the Doc type Dropdown results');

            this.baseTaskList.subscribe(items => {
              this.swimlanes[0]['array'].push(result);
            });

          }, error => {
            console.log('HttpClient get request error for----- ' + error.message);
          });
      });


  }

  constructor(private router: Router,
    private cgRefCodControllerService: CgRefCodControllerService,
    private documentService: DocumentService,
    private requestModel: RequestModel) {

  }


  ngOnInit(): void {

    this.loadFiles();

    this.cgRefCodControllerService.getPfrDocTypeUsingGET().subscribe(
      result => {
        console.log('Getting the Doc type Dropdown results');
        this.DocTypes = result;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

  }

  loadFiles() {
    this.documentService.getFiles(1, 'PFR').subscribe(
      result => {
        console.log('Getting the Doc type Dropdown results');
        this.baseTaskList = of(result);
        this.include = this.baseTaskList.pipe(
          map(tasks => tasks.filter(task => task.createDate !== null))
        );
        this.exclude = this.baseTaskList.pipe(
          map(tasks => tasks.filter(task => task.createDate === null))
        );

        this.include.subscribe(data => {
          console.log("included data:" +data);
          this.swimlanes.push({ name: 'Included Content', array: data });
        });
        this.exclude.subscribe(data => {
          console.log("excluded data:" +data);
          this.swimlanes.push({ name: 'Excluded Content', array: data });
        });
    
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
  }

  drop(event: CdkDragDrop<DocumentsDto[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

  }

  downloadFile(id: number, fileName: string) {
    this.documentService.downloadById(id).subscribe(blob => saveAs(blob, fileName)), error =>
      console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  downloadCoverSheet() {
    this.documentService.downloadFrqCoverSheet(36182).subscribe(blob => saveAs(blob, 'Cover Page.pdf')), error =>
      console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  deleteDoc(id: number) {
    this.documentService.deleteDocById(id).subscribe(
      result => {
        console.log("Delete Success");
        this.loadFiles();
      }
    ), error => {
      console.log("Error while deleting the document");
      this.loadFiles();
    };

    
  }

  nextStep() {
    this.router.navigate(['/request/step4']);
  }

  prevStep() {
    this.router.navigate(['/request/step2']);
  }

}
