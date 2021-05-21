import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import 'select2';
import { Options } from 'select2';
import {
  CgRefCodControllerService, CgRefCodesDto, DocumentsDto, NciPfrGrantQueryDto,
  FsRequestControllerService, FsDocOrderControllerService, FundingRequestDocOrderDto, DocumentsControllerService
} from '@nci-cbiit/i2ecws-lib';
import { DocumentService } from '../../service/document.service';
import { RequestModel } from '../../model/request-model';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { saveAs } from 'file-saver';
import { of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpEventType, HttpResponse } from '@angular/common/http';

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


  public DocTypes: Observable<Array<CgRefCodesDto>>;
  public options: Options;
  public _selectedDocType: string = '';
  public _docDescription: string = '';
  justificationUploaded?: Observable<boolean>;
  disableJustification: boolean = false;
  disableFile: boolean = false;
  _docOrderDto: FundingRequestDocOrderDto = {};
  _docOrderDtos: FundingRequestDocOrderDto[] = [];

  showJustification: boolean = false;

  baseTaskList: Observable<DocumentsDto[]>;
  include: Observable<DocumentsDto[]>;
  exclude: Observable<DocumentsDto[]>;

  swimlanes: Swimlane[] = [];

  selectedFiles: FileList;

  @ViewChild('inputFile')
  myInputVariable: ElementRef;


  get grant(): NciPfrGrantQueryDto {
    return this.model.grant;
  }

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
    this.disableJustification = true;

  }

  public _docDto: DocumentsDto = {};

  uploadFiles() {
    if (this.docDescription !== '') {

      //Upate justification Text
      this.fsRequestControllerService.updateJustificationUsingPUT(this.requestModel.requestDto.frqId, this.docDescription).subscribe(
        result => {
          this.justificationUploaded = of(true);
          this.requestModel.requestDto = result;
          this.reset();
        }, error => {
          console.log('HttpClient get request error for----- ' + error.message);
        });

    } else {

      for (let i = 0; i < this.selectedFiles.length; i++) {
        this._docDto.docDescription = this.docDescription;
        this._docDto.docType = this.selectedDocType;
        this._docDto.keyId = this.requestModel.requestDto.frqId;
        this._docDto.keyType = 'PFR';
        this.upload(this.selectedFiles[i]);
        this.reset();

        if (this._docDto.docType === 'Justification') {
          this.justificationUploaded = of(true);
        }

      }
    }

  }

  reset() {
    this.myInputVariable.nativeElement.value = '';
    this.selectedDocType = '';
    this.docDescription = '';
    this.disableJustification = false;
    this.disableFile = false;
  }

  upload(file) {
    this.documentService.upload(file, this._docDto).subscribe(
      event => {
        if (event instanceof HttpResponse) {

          //Get the ID of the latest record
          this.documentService.getLatestFile(this._docDto.keyId, 'PFR').subscribe(
            result => {
              console.log('Retrieving the Doc that just got inserted since we need to know the ID');
              console.log(result.docType);

              if (result.docType !== 'Justification') {
                this.baseTaskList.subscribe(items => {
                  this.swimlanes[0]['array'].push(result);
                });
              }

              // Insert records into FUNDING_REQUEST_DOC_ORDER_T
              this.insertDocOrder(result);

            }, error => {
              console.log('HttpClient get request error for----- ' + error.message);
            });

          //Remove Doc Type from the drop down
          this.DocTypes.forEach(element => {
            element.forEach((e, index) => {
              if (e.rvLowValue === this._docDto.docType) {
                element.splice(index, 1);
              }
            })
          });




        }
      },
      err => {
        console.log('Error occured while uploading doc----- ' + err.message);
      });


  }

  constructor(private router: Router,
    private cgRefCodControllerService: CgRefCodControllerService,
    private documentService: DocumentService,
    private requestModel: RequestModel,
    private fsRequestControllerService: FsRequestControllerService,
    private fsDocOrderControllerService: FsDocOrderControllerService,
    private documentsControllerService: DocumentsControllerService) {

  }


  ngOnInit(): void {

    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }

    this.cgRefCodControllerService.getPfrDocTypeUsingGET().subscribe(
      result => {
        console.log('Getting the Doc type Dropdown results');
        this.DocTypes = of(result);
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

    this.loadFiles();

  }

  loadFiles() {
    this.documentService.getFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
      result => {
        console.log('loading documents');

        result.forEach(element => {
          if (element.docFilename == 'Justification') {

            this.justificationUploaded = of(true);
          }
        });


        this.baseTaskList = of(result);
        this.include = this.baseTaskList.pipe(
          map(tasks => tasks.filter(task => task.included === 'Y'))
        );
        this.exclude = this.baseTaskList.pipe(
          map(tasks => tasks.filter(task => task.included === 'N'))
        );

        this.include.subscribe(data => {
          console.log("included data:" + data);
          this.swimlanes.push({ name: 'Included Content', array: data });
        });
        this.exclude.subscribe(data => {
          console.log("excluded data:" + data);
          this.swimlanes.push({ name: 'Excluded Content', array: data });
        });

      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
  }

  drop(event: CdkDragDrop<DocumentsDto[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data,
        event.previousIndex,
        event.currentIndex);
      console.log("In the same container")
      //If container.id = 'included', then sort order needs to be updated.
      //update sort order for both records

      if (event.container.id === 'includedId') {
        this.updateDocOrder(event.container.data);
      }


    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      console.log("In the different container")
      //If previousContainer == included and container = excluded, data is moved to excluded.
      //Delete data from the DOC order table
      if (event.previousContainer.id === 'includedId') {
        this.deleteDocOrder(event.container.data[event.currentIndex]);
      } else {

        //Else if previousContainer = excluded and container = included, data is moved to included.
        //Insert new record and then update sort order for all of them for this frqId
        this.insertDocOrder(event.container.data[event.currentIndex]);
        this.updateDocOrder(event.container.data);

      }

    }
  }

  downloadFile(id: number, fileName: string) {
    if (fileName === 'Summary Statement') {
      this.downloadSummaryStatement();
    } else {
      this.documentService.downloadById(id).subscribe(blob => saveAs(blob, fileName)), error =>
        console.log('Error downloading the file'),
        () => console.info('File downloaded successfully');
    }

  }

  downloadCoverSheet() {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId).subscribe(blob => saveAs(blob, 'Cover Page.pdf')), error =>
      console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  downloadSummaryStatement() {
    this.documentService.downloadFrqSummaryStatement(this.requestModel.grant.applId).subscribe(blob => saveAs(blob, 'Summary Statement.pdf')), error =>
      console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  deleteDoc(id: number) {
    let tempDocDto: DocumentsDto;
    this.documentService.deleteDocById(id).subscribe(
      result => {
        console.log("Delete Success");
        this.baseTaskList.subscribe(items => {
          this.swimlanes[0]['array'].forEach((value, index) => {
            if (value.id == id) {
              this.swimlanes[0]['array'].splice(index, 1);
              this.deleteDocOrder(value);
            }

          });
        });

      }
    ), err => {
      console.log("Error while deleting the document");
    };

  }

  downloadPackage() {
    var docIds: number[] = [];
    this.baseTaskList.subscribe(items => {
      this.swimlanes[0]['array'].forEach((value, index) => {
        docIds.push(value.id);
      });
    });

    this.documentService.downLoadFrqPackage(this.requestModel.requestDto.frqId,
      this.requestModel.grant.applId, docIds).subscribe(blob => saveAs(blob, 'Package.pdf')), error =>
        console.log('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  onDocTypeChange(event): any {
    console.log('change', event);
    if (event === 'Justification') {
      this.showJustification = true;
    } else {
      this.showJustification = false;
    }
  }

  justificationOnChange() {
    if (this.docDescription !== '') {
      this.disableFile = true;
    } else {
      this.disableFile = false;
    }
  }

  updateDocOrder(docDtos: DocumentsDto[]) {
    docDtos.forEach((value, index) => {
      this._docOrderDto.docId = value.id;
      this._docOrderDto.sortOrderNum = index + 1;
      this._docOrderDtos.push(this._docOrderDto);
      this._docOrderDto = {};

    });

    this.fsDocOrderControllerService.updateDocOrderUsingPUT(this._docOrderDtos).subscribe(
      res => {
        console.log("Doc order update successful")
        this._docOrderDtos.length = 0;
      }, error => {
        console.log('Error occured while updating DOC ORDER----- ' + error.message);
      });

  }

  deleteDocOrder(docDto: DocumentsDto) {

    
    this.fsDocOrderControllerService.deleteDocOrderUsingDELETE(docDto.id).subscribe(
      res => {
        console.log("Doc order delete successful")
      }, error => {
        console.log('Error occured while deleting DOC ORDER----- ' + error.message);
      });
  }

  insertDocOrder(docDto: DocumentsDto) {

    this._docOrderDto.docTypeCode = docDto.docType;
    this._docOrderDto.docId = docDto.id;
    this._docOrderDto.frqId = this.requestModel.requestDto.frqId;

    this.fsDocOrderControllerService.createDocOrderUsingPOST(this._docOrderDto).subscribe(
      res => {
        console.log("Doc order save successful")
      }, error => {
        console.log('Error occured while saving DOC ORDER----- ' + error.message);
      });
  }

  nextStep() {


    this.documentsControllerService.loadDocumentsBySortOrderUsingGET(this.requestModel.requestDto.frqId).subscribe(

      result => {
        console.log("Docs retrieved by doc order");
        this.requestModel.requestDto.includedDocs = result;
        this.router.navigate(['/request/step4']);
      }, error => {
        console.log('Error occured while retrieving docs by DOC ORDER----- ' + error.message);
      }
    );

    
  }

  prevStep() {
    this.router.navigate(['/request/step2']);
  }

}
