import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import 'select2';
import {Options} from 'select2';
import {
  CgRefCodControllerService, CgRefCodesDto, DocumentsDto, NciPfrGrantQueryDto,
  FsRequestControllerService, FsDocOrderControllerService, FundingRequestDocOrderDto, DocumentsControllerService
} from '@nci-cbiit/i2ecws-lib';
import {DocumentService} from '../../service/document.service';
import {RequestModel} from '../../model/request-model';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {saveAs} from 'file-saver';
import {of, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {HttpResponse} from '@angular/common/http';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';
import {NGXLogger} from 'ngx-logger';

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
  disableFile: boolean = true;
  _docOrderDto: FundingRequestDocOrderDto = {};
  _docOrderDtos: FundingRequestDocOrderDto[] = [];
  showJustification: boolean = false;
  baseTaskList: Observable<DocumentsDto[]>;
  include: Observable<DocumentsDto[]>;
  exclude: Observable<DocumentsDto[]>;
  swimlanes: Swimlane[] = [];
  selectedFiles: FileList;
  justificationType: string = '';
  justificationEnteredBy: string = '';
  justificationEnteredByEmail: string = '';
  justificationFileName: string = '';
  justificationUploadedOn: Date;
  justificationId: number;
  justificationText: string = '';
  _docType: CgRefCodesDto = {};
  closeResult: string;
  maxFileSize: number = 10485760; //10MB
  maxFileSizeError: string;

  @ViewChild('inputFile')
  inputFile: ElementRef;


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


  constructor(private router: Router,
              private cgRefCodControllerService: CgRefCodControllerService,
              private documentService: DocumentService,
              private requestModel: RequestModel,
              private fsRequestControllerService: FsRequestControllerService,
              private fsDocOrderControllerService: FsDocOrderControllerService,
              private documentsControllerService: DocumentsControllerService,
              private modalService: NgbModal,
              private logger: NGXLogger) {

  }

  ngOnInit(): void {

    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }

    this.requestModel.setStepLinkable(3, true);
    this.cgRefCodControllerService.getPfrDocTypeUsingGET().subscribe(
      result => {
        this.DocTypes = of(result);
        this.logger.debug('Getting the Doc type Dropdown results: ', this.DocTypes);
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

    this.loadFiles();

  }

  selectFiles(event) {
    this.selectedFiles = event.target.files;
    this.disableJustification = true;

  }

  public _docDto: DocumentsDto = {};

  uploadFiles() {
    if (this.docDescription !== '') {
      //Upate justification Text
      this.uploadJustification(this.docDescription);
    } else {

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
    }
    this.reset();
  }

  uploadJustification(justification: string) {
    this.fsRequestControllerService.updateJustificationUsingPUT(this.requestModel.requestDto.frqId, justification).subscribe(
      result => {
        this.justificationUploaded = of(true);
        this.requestModel.requestDto.justification = justification;
        this.justificationText = justification;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

    this.justificationType = 'text';
  }

  reset() {
    this.inputFile.nativeElement.value = '';
    this.selectedDocType = '';
    this.docDescription = '';
    this.disableJustification = false;
    this.disableFile = false;
  }

  upload(file) {
    this.documentService.upload(file, this._docDto).subscribe(
      event => {
        if (event instanceof HttpResponse) {


          const result = event.body;
          this.logger.debug('Upload Doc: ', result);

          if (result.docType !== 'Justification') {
            this.baseTaskList.subscribe(items => {
              this.swimlanes[0]['array'].push(result);
            });
          } else {
            if (this._docDto.docType === 'Justification') {
              this.justificationUploaded = of(true);
              this.justificationType = 'file';
              this.justificationEnteredBy = result.uploadByName;
              this.justificationEnteredByEmail = result.uploadByEmail;
              this.justificationFileName = result.docFilename;
              this.justificationUploadedOn = result.createDate;
              this.justificationId = result.id;
            }
          }

          this.insertDocOrder(result);

          //Remove Doc Type from the drop down
          this.DocTypes.forEach(element => {
            element.forEach((e, index) => {
              if (e.rvLowValue === this._docDto.docType) {
                element.splice(index, 1);
              }
            });
          });
        }
      },
      err => {
        this.logger.error('Error occured while uploading doc----- ' + err.message);
      });
  }

  loadFiles() {
    this.documentService.getFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
      result => {
        result.forEach(element => {
          if (element.docFilename == 'Justification') {
            this.logger.debug('Loading Document type: ', element.docFilename);
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
          this.logger.debug('Included data: ' + data);
          this.swimlanes.push({name: 'Included Content', array: data});
        });
        this.exclude.subscribe(data => {
          this.logger.debug('Excluded data: ' + data);
          this.swimlanes.push({name: 'Excluded Content', array: data});
        });

      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  drop(event: CdkDragDrop<DocumentsDto[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data,
        event.previousIndex,
        event.currentIndex);

      //If container.id = 'included', then sort order needs to be updated.
      //update sort order for all records
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
      this.documentService.downloadById(id)
        .subscribe(
          (response: HttpResponse<Blob>) => {
            let blob = new Blob([response.body], {'type': response.headers.get('content-type')});
            saveAs(blob, fileName);
          }
        );
    }
  }

  downloadCoverSheet() {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], {'type': response.headers.get('content-type')});
          saveAs(blob, 'Cover Page.pdf');
        }
      );
  }

  downloadSummaryStatement() {
    this.documentService.downloadFrqSummaryStatement(this.requestModel.grant.applId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], {'type': response.headers.get('content-type')});
          saveAs(blob, 'Summary Statement.pdf');
        }
      ), error =>
      this.logger.error('Error downloading the summary statement'),
      () => this.logger.info('File downloaded successfully');
  }

  deleteDoc(id: number, docType: string) {
    this.documentService.deleteDocById(id).subscribe(
      result => {
        this.logger.info('Delete Success');
        this.baseTaskList.subscribe(items => {
          this.swimlanes[0]['array'].forEach((value, index) => {
            if (value.id == id) {
              this.swimlanes[0]['array'].splice(index, 1);
              this.deleteDocOrder(value);
            }
          });
        });

        this.pushDocType(docType);

        if (docType == 'Justification') {

          this.justificationUploaded = of(false);
        }

      }
    ), err => {
      this.logger.error('Error while deleting the document');
    };

  }

  pushDocType(docType: string) {
    this._docType.rvLowValue = docType;
    this.DocTypes.forEach(element => {
      element.push(this._docType);
    });
  }

  downloadPackage() {
    var docIds: number[] = [];
    this.baseTaskList.subscribe(items => {
      this.swimlanes[0]['array'].forEach((value, index) => {
        docIds.push(value.id);
      });
    });

    this.documentService.downLoadFrqPackage(this.requestModel.requestDto.frqId,
      this.requestModel.grant.applId, docIds)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], {'type': response.headers.get('content-type')});
          saveAs(blob, 'Package.pdf');
        }
      ), error =>
      this.logger.error('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  onDocTypeChange(event): any {
    this.logger.debug('Doc Type Change: ', event);
    if (event === 'Justification') {
      this.showJustification = true;
    } else {
      this.showJustification = false;
    }
    if (event === '') {
      this.disableFile = true;
    } else {
      this.disableFile = false;
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
        this.logger.debug('Doc order delete successful for docId: ', this._docOrderDtos);
        this._docOrderDtos.length = 0;
      }, error => {
        this.logger.error('Error occured while updating DOC ORDER----- ' + error.message);
      });

  }

  deleteDocOrder(docDto: DocumentsDto) {
    this.fsDocOrderControllerService.deleteDocOrderUsingDELETE(docDto.id).subscribe(
      res => {
        this.logger.debug('Doc order delete successful for docId: ', docDto.id);
      }, error => {
        this.logger.error('Error occured while deleting DOC ORDER----- ' + error.message);
      });
  }

  insertDocOrder(docDto: DocumentsDto) {
    this._docOrderDto.docTypeCode = docDto.docType;
    this._docOrderDto.docId = docDto.id;
    this._docOrderDto.frqId = this.requestModel.requestDto.frqId;

    this.fsDocOrderControllerService.createDocOrderUsingPOST(this._docOrderDto).subscribe(
      res => {
        this.logger.debug('Doc order save successful for doc: ', this._docOrderDto);
      }, error => {
        this.logger.error('Error occured while saving DOC ORDER----- ' + error.message);
      });
  }

  deleteJustification() {
    if (this.justificationType == 'text') {
      this.uploadJustification('');
    } else {
      this.deleteDoc(this.justificationId, 'Justification');
    }
  }

  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  nextStep(): void {
    this.documentsControllerService.loadDocumentsBySortOrderUsingGET(this.requestModel.requestDto.frqId).subscribe(
      result => {
        this.requestModel.requestDto.includedDocs = result;
        this.logger.debug('Docs retrieved by doc order: ', result);
        this.router.navigate(['/request/step4']);
      }, error => {
        this.logger.error('Error occured while retrieving docs by DOC ORDER----- ' + error.message);
      }
    );
  }

  prevStep(): void {
    this.fsRequestControllerService.getRequestBudgetsUsingGET(this.requestModel.requestDto.financialInfoDto.fundingRequestId).subscribe(
      result => {
        this.requestModel.requestDto.financialInfoDto.fundingReqBudgetsDtos = result;
        this.requestModel.restoreLineItems(result);
        this.router.navigate(['/request/step2']);
      });
  }

}
