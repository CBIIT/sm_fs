import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import 'select2';
import { Options } from 'select2';
import {
  CgRefCodControllerService, CgRefCodesDto, DocumentsDto, NciPfrGrantQueryDto,
  FsRequestControllerService, FsDocOrderControllerService, FundingRequestDocOrderDto, DocumentsControllerService,
  ApplAdminSuppRoutingsDto, UserControllerService, FundingRequestDto
} from '@cbiit/i2ecws-lib';
import { DocumentService } from '../../service/document.service';
import { RequestModel } from '../../model/request/request-model';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { saveAs } from 'file-saver';
import { of, Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { formatDate } from '@angular/common';
import { NavigationStepModel } from '../step-indicator/navigation-step.model';

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
  transitionMemoUploaded?: Observable<boolean>;
  displayTansitionMemo: boolean = false;
  isTransitionMemoRequired: boolean = false;
  disableJustification: boolean = false;
  disableFile: boolean = true;
  _docOrderDto: FundingRequestDocOrderDto = {};
  _docOrderDtos: FundingRequestDocOrderDto[] = [];
  showJustification: boolean = false;
  showSuppApplications: boolean = false;
  baseTaskList: Observable<DocumentsDto[]>;
  include: Observable<DocumentsDto[]>;
  swimlanes: Swimlane[] = [];
  selectedFiles: FileList;
  justificationType: string = '';
  justificationEnteredBy: string = '';
  justificationEnteredByEmail: string = '';
  justificationFileName: string = '';
  justificationUploadedOn: Date = new Date();
  justificationEnteredByEmit = new BehaviorSubject<string>(this.justificationEnteredBy);
  justificationEnteredByEmailEmit = new BehaviorSubject<string>(this.justificationEnteredByEmail);
  justificationUploadedOnEmit = new BehaviorSubject<string>(this.justificationUploadedOn.toString());

  transitionMemoEnteredBy: string = '';
  transitionMemoEnteredByEmail: string = '';
  transitionMemoFileName: string = '';
  transitionMemoUploadedOn: Date = new Date();
  transitionMemoEnteredByEmit = new BehaviorSubject<string>(this.transitionMemoEnteredBy);
  transitionMemoEnteredByEmailEmit = new BehaviorSubject<string>(this.transitionMemoEnteredByEmail);
  transitionMemoUploadedOnEmit = new BehaviorSubject<string>(this.transitionMemoUploadedOn.toString());

  justificationId: number;
  transitionMemoId: number;
  justificationText: string = '';
  _docType: CgRefCodesDto = {};
  closeResult: string;
  maxFileSize: number = 10485760; //10MB
  maxFileSizeError: string;
  public _docDto: DocumentsDto = {};
  otherDocsCount: number = 0;
  showValidations: boolean = false;
  isFileSelected: boolean = false;
  isJustificationEntered: boolean = false;
  isTypeSelected: boolean = false;
  applAdminSuppRoutingsDtos: ApplAdminSuppRoutingsDto[] = [];
  disableAddDocButton: boolean = true;
  isSSDocOrderCreated: boolean = false;


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
    private userControllerService: UserControllerService,
    private modalService: NgbModal,
    private navigationModel: NavigationStepModel,
    private logger: NGXLogger) {

  }

  ngOnInit(): void {

    if (!this.requestModel.grant) {
      this.router.navigate(['/request']);
    }
    this.navigationModel.setStepLinkable(3, true);
    this.cgRefCodControllerService.getPfrDocTypeUsingGET().subscribe(
      result => {
        this.DocTypes = of(result);
        this.addTransitionMemo();
        this.loadJustificationText();
        this.loadFiles();
        this.isSupplementAction()
        this.loadSuppApps();

        this.logger.debug('Getting the Doc type Dropdown results: ', this.DocTypes);
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  addTransitionMemo() {

    if (this.requestModel.requestDto.requestType === 'Pay Type 4') {
      this.pushDocType("Transition Memo");
      this.displayTansitionMemo = true;
      if (this.requestModel.requestDto.conversionActivityCode !== 'NC') {
        this.isTransitionMemoRequired = true;
      }
    }
  }

  loadJustificationText() {
    if (this.requestModel.requestDto.justification) {

      this.justificationUploaded = of(true);
      this.justificationText = this.requestModel.requestDto.justification;
      this.justificationType = 'text';
      this.removeDocType('Justification');
      if (this.requestModel.requestDto.justificationCreateNpnId) {
        this.userControllerService.findByNpnIdUsingGET(this.requestModel.requestDto.justificationCreateNpnId).subscribe(
          result => {
            this.requestModel.requestDto.justificationCreateByFullName = result.fullNameLF;
            this.requestModel.requestDto.justificationCreateByEmailAddress = result.emailAddress;
            this.justificationEnteredBy = result.fullNameLF;
            this.justificationEnteredByEmail = result.emailAddress;
            this.justificationUploadedOn = this.requestModel.requestDto.justificationCreateDate;
            this.justificationEnteredByEmit.next(this.justificationEnteredBy);
            this.justificationEnteredByEmailEmit.next(this.justificationEnteredByEmail);
            this.justificationUploadedOnEmit.next(this.format(this.justificationUploadedOn, 'dd/MM/yyyy'));

          }, error => {
            this.logger.error('HttpClient get request error for----- ' + error.message);
          });
      }

    }

  }

  format(date: Date, format: string): string {
    const locale = 'en-US';
    return formatDate(date, format, locale);
  }

  loadSuppApps() {
    this.fsRequestControllerService.retrieveAdminSuppRoutingsUsingGET(this.requestModel.grant.applId).subscribe(
      result => {
        this.applAdminSuppRoutingsDtos = result;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }



  isSupplementAction() {
    var isSuppAction: boolean = false;
    if (this.requestModel.requestDto.requestType === 'Pay Type 4') {
      isSuppAction = true;

    }
    if (!isSuppAction) {
      this.fsRequestControllerService.findByRequestTypeCategoryUsingGET('SUPPLEMENT').subscribe(
        result => {
          result.forEach((element, index) => {
            if (Number(element.id) === Number(this.requestModel.requestDto.parentFrtId)) {
              isSuppAction = true;
            }

          });
          if (!isSuppAction) {
            this.removeDocType("Supplement Application");
          }

        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }

  }

  selectFiles(event): void {
    this.selectedFiles = event.target.files;
    this.disableJustification = true;
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      this.disableAddDocButton = false;
    }

  }


  uploadFiles() {

    if (this.selectedDocType === 'Justification') {
      if (this.docDescription !== '') {
        //Upate justification Text
        this.uploadJustificationText(this.docDescription);
        this.removeDocType("Justification");
      } else {
        this.populateDocDto();
      }
    } else {
      this.populateDocDto();
    }

    this.reset();
  }

  private populateDocDto() {

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

  uploadJustificationText(justification: string) {
    let reqDto: FundingRequestDto = {};
    reqDto.frqId = this.requestModel.requestDto.frqId;
    reqDto.justification = justification;
    this.fsRequestControllerService.updateJustificationUsingPUT(reqDto).subscribe(
      result => {

        this.justificationUploaded = of(true);
        this.requestModel.requestDto.justification = justification;
        this.requestModel.requestDto.justificationCreateByFullName = result.justificationCreateByFullName;
        this.requestModel.requestDto.justificationCreateByEmailAddress = result.justificationCreateByEmailAddress;
        this.requestModel.requestDto.justificationCreateDate = result.justificationCreateDate;
        this.requestModel.requestDto.justificationCreateNpnId = result.justificationCreateNpnId;
        this.justificationText = justification;
        this.justificationEnteredBy = this.requestModel.requestDto.justificationCreateByFullName;
        this.justificationEnteredByEmail = this.requestModel.requestDto.justificationCreateByEmailAddress;
        this.justificationUploadedOn = new Date(this.requestModel.requestDto.justificationCreateDate);
        this.justificationEnteredByEmit.next(this.justificationEnteredBy);
        this.justificationEnteredByEmailEmit.next(this.justificationEnteredByEmail);
        this.justificationUploadedOnEmit.next(this.format(this.justificationUploadedOn, 'dd/MM/yyyy'));

        //Inserting doc order
        let docDto: DocumentsDto = {};
        docDto.docType = 'Justification';
        docDto.keyId = this.requestModel.requestDto.frqId;
        docDto.keyType = 'PFR';
        this.insertDocOrder(docDto);

      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

    this.justificationType = 'text';
    this.showJustification = false;
  }

  reset() {
    this.inputFile.nativeElement.value = '';
    this.selectedDocType = '';
    this.docDescription = '';
    this.disableJustification = false;
    this.disableFile = true;
    this.showValidations = false;
    this.isJustificationEntered = false;
    this.isFileSelected = false;
    this.isTypeSelected = false;
    this.showSuppApplications = false;
    this.disableAddDocButton = true;
    this.showJustification = false;

  }

  upload(file) {
    this.documentService.upload(file, this._docDto).subscribe(
      event => {
        if (event instanceof HttpResponse) {

          const result = event.body;
          this.logger.debug('Upload Doc: ', result);

          if (!(result.docType === DocTypeConstants.JUSTIFICATION
            || (result.docType === DocTypeConstants.TRANSITION_MEMO &&
              this.isTransitionMemoRequired))) {
            this.baseTaskList.subscribe(items => {
              this.swimlanes[0]['array'].push(result);
            });
          } else {
            if (this._docDto.docType === DocTypeConstants.JUSTIFICATION) {
              this.loadJustification(result);
            }
            if (this._docDto.docType === DocTypeConstants.TRANSITION_MEMO) {
              this.loadTransitionMemo(result);
            }
          }

          this.insertDocOrder(result);       

          this.documentService.getFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
            result => {
              result.forEach(element => {
                this.removeDocType(element.docType);
              });
            }, error => {
              this.logger.error('HttpClient get request error for----- ' + error.message);
            });
        }
      },
      err => {
        this.logger.error('Error occured while uploading doc----- ' + err.message);
      });
  }


  //Remove Doc Type from the drop down
  removeDocType(docType: string) {

    if (docType === 'Other') {
      this.otherDocsCount++;
      if (this.otherDocsCount == 3) {
        this.spliceDocType(docType)
      }
    } else {
      this.spliceDocType(docType)
    }

  }

  spliceDocType(docType: string) {

    this.DocTypes.forEach(element => {
      element.forEach((e, index) => {
        if (e.rvLowValue === docType) {
          element.splice(index, 1);
        }
      });
    });
  }

  loadFiles() {
    this.documentService.getFiles(this.requestModel.requestDto.frqId, 'PFR').subscribe(
      result => {
        result.forEach(element => {
          if (element.docType === DocTypeConstants.JUSTIFICATION) {
            this.loadJustification(element);
          }

          if (element.docType === DocTypeConstants.TRANSITION_MEMO &&
            this.isTransitionMemoRequired) {
            this.loadTransitionMemo(element);
          }

          if (element.docType === DocTypeConstants.SUMMARY_STATEMENT &&
            element.fsSSUploaded === 'Y') {
            this.isSSDocOrderCreated = true;
          }

          this.removeDocType(element.docType);
        });

        this.createSSDocOrder();

        this.baseTaskList = of(result);
        this.include = this.baseTaskList.pipe(
          map(tasks => tasks.filter(task => task.included === 'Y' &&
            !(task.docType === DocTypeConstants.JUSTIFICATION ||
              (task.docType === DocTypeConstants.TRANSITION_MEMO &&
                this.isTransitionMemoRequired))))
        );


        this.include.subscribe(data => {
          this.logger.debug('Included data: ' + data);
          this.swimlanes.push({ name: 'Included Content', array: data });
        });


      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

  }

  private createSSDocOrder() {
    if (!this.isSSDocOrderCreated) {
      let docDto: DocumentsDto = {};
      docDto.docType = DocTypeConstants.SUMMARY_STATEMENT;
      docDto.keyId = this.requestModel.requestDto.frqId;
      docDto.keyType = 'PFR';
      this.insertDocOrder(docDto);

    }
  }

  loadJustification(element: DocumentsDto) {

    if (element.docType === DocTypeConstants.JUSTIFICATION &&
      element.id !== null) {
      this.logger.debug('Loading Document type: ', element.docFilename);
      this.justificationUploaded = of(true);

      this.justificationEnteredBy = element.uploadByName;
      this.justificationEnteredByEmail = element.uploadByEmail;
      this.justificationFileName = element.docFilename;
      this.justificationUploadedOn = new Date(element.createDate);

      this.justificationEnteredByEmit.next(this.justificationEnteredBy);
      this.justificationEnteredByEmailEmit.next(this.justificationEnteredByEmail);
      this.justificationUploadedOnEmit.next(this.format(this.justificationUploadedOn, 'dd/MM/yyyy'));

      this.justificationId = element.id;
      if (element.id !== null) {
        this.justificationType = 'file';
      }
    }

  }

  loadTransitionMemo(element: DocumentsDto) {

    if (element.docType === DocTypeConstants.TRANSITION_MEMO) {
      this.logger.debug('Loading Document type: ', element.docFilename);
      this.transitionMemoUploaded = of(true);

      this.transitionMemoEnteredBy = element.uploadByName;
      this.transitionMemoEnteredByEmail = element.uploadByEmail;
      this.transitionMemoFileName = element.docFilename;
      this.transitionMemoUploadedOn = new Date(element.createDate);
      this.transitionMemoId = element.id;

      this.transitionMemoEnteredByEmit.next(this.transitionMemoEnteredBy);
      this.transitionMemoEnteredByEmailEmit.next(this.transitionMemoEnteredByEmail);
      this.transitionMemoUploadedOnEmit.next(this.format(this.transitionMemoUploadedOn, 'dd/MM/yyyy'));
    }

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
    } else if (fileName === 'Supplement Application') {
      this.downloadSupplementAppDoc(this.requestModel.requestDto.suppApplId);
    } else {
      this.documentService.downloadById(id)
        .subscribe(
          (response: HttpResponse<Blob>) => {
            let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
            saveAs(blob, fileName);
          }
        );
    }
  }

  downloadCoverSheet() {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'Cover Page.pdf');
        }
      );
  }

  downloadSummaryStatement() {
    this.documentService.downloadFrqSummaryStatement(this.requestModel.grant.applId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'Summary Statement.pdf');
        }
      ), error =>
        this.logger.error('Error downloading the summary statement'),
      () => this.logger.info('File downloaded successfully');
  }

  deleteDoc(id: number, docType: string) {
    if (id !== null) {
      this.documentService.deleteDocById(id).subscribe(
        result => {
          this.logger.info('Delete Success');
          this.deleteDocOrder(result);
          this.baseTaskList.subscribe(items => {
            this.swimlanes[0]['array'].forEach((value, index) => {
              if (value.id == id) {
                this.swimlanes[0]['array'].splice(index, 1);

              }
            });
          });

          this.pushDocType(docType);
          if (docType == DocTypeConstants.JUSTIFICATION) {
            this.justificationUploaded = of(false);
          }
          if (docType == DocTypeConstants.TRANSITION_MEMO) {
            this.transitionMemoUploaded = of(false);
          }

        }
      ), err => {
        this.logger.error('Error while deleting the document');
      };
    } else {
      if (docType === 'Supplement Application') {
        //delete supp apps in the funding_requests_t table
        this.deleteSuppApplDocs(docType);
      }
    }


  }

  private deleteSuppApplDocs(docType: string) {
    this.fsRequestControllerService.deleteSuppApplIdUsingPUT(this.requestModel.requestDto.frqId).subscribe(
      res => {
        this.logger.debug('justification deleted');
        this.requestModel.requestDto.suppApplId = null;
        this.deleteDocOrder(res);
        this.pushDocType(docType);
        this.baseTaskList.subscribe(items => {
          this.swimlanes[0]['array'].forEach((value, index) => {
            if (value.docType === docType) {
              this.swimlanes[0]['array'].splice(index, 1);

            }
          });
        });
      }, error => {
        this.logger.error('Error occured while deleting justification----- ' + error.message);
      });
  }

  pushDocType(docType: string) {

    if (docType === 'Other') {
      this.otherDocsCount--;
    }
    var docTypeDto: CgRefCodesDto = {};
    docTypeDto.rvLowValue = docType;
    var isDocTypeExists: boolean = false;
    this.DocTypes.forEach(element => {
      element.forEach(e => {
        if (e.rvLowValue === docType) {
          isDocTypeExists = true;
        }
      });

    });
    if (!isDocTypeExists) {
      this.DocTypes.subscribe(subscriber => {
        subscriber.push(docTypeDto);
      });

    }

  }

  downloadPackage() {


    this.documentService.downLoadFrqPackage(this.requestModel.requestDto.frqId,
      this.requestModel.grant.applId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'Package.pdf');
        }
      ), error =>
        this.logger.error('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  onDocTypeChange(event): any {

    this.inputFile.nativeElement.value = ''
    this.disableJustification = false;
    this.isTypeSelected = false;
    if (event === 'Justification') {
      this.showJustification = true;
    } else {
      this.showJustification = false;
    }
    if (event === 'Supplement Application') {
      if (this.applAdminSuppRoutingsDtos.length > 0) {
        this.showSuppApplications = true;
      }

    } else {
      this.showSuppApplications = false;
    }
    if (event === '') {
      this.disableFile = true;
    } else {
      this.disableFile = false;
    }
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      this.disableAddDocButton = false;
    } else {
      this.disableAddDocButton = true;
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
      this._docOrderDto.frqId = this.requestModel.requestDto.frqId;
      this._docOrderDto.docTypeCode = value.docType;
      this._docOrderDtos.push(this._docOrderDto);
      this._docOrderDto = {};

    });

    this.fsDocOrderControllerService.updateDocOrderUsingPUT(this._docOrderDtos).subscribe(
      res => {
        this.logger.debug('Doc order update successful for docId: ', this._docOrderDtos);
        this._docOrderDtos.length = 0;
      }, error => {
        this.logger.error('Error occured while updating DOC ORDER----- ' + error.message);
      });

  }

  deleteDocOrder(docDto: DocumentsDto) {
    if (docDto.id !== null) {
      this.fsDocOrderControllerService.deleteDocOrderUsingDELETE(docDto.id).subscribe(
        res => {
          this.logger.debug('Doc order delete successful for docId: ', docDto.id);
        }, error => {
          this.logger.error('Error occured while deleting DOC ORDER----- ' + error.message);
        });
    } else {

      this.fsDocOrderControllerService.deleteDocOrderByDocTypesUsingDELETE(docDto.docType, this.requestModel.requestDto.frqId).subscribe(
        res => {
          this.logger.debug('Doc order delete successful for docId: ', this.requestModel.requestDto.frqId);
        }, error => {
          this.logger.error('Error occured while deleting DOC ORDER----- ' + error.message);
        });
    }
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


      this.fsRequestControllerService.deleteJustificationUsingPUT(this.requestModel.requestDto.frqId).subscribe(
        res => {
          this.logger.debug('justification deleted');
          this.requestModel.requestDto.justification = '';

          //Delete Doc Order
          this.fsDocOrderControllerService.deleteDocOrderByDocTypesUsingDELETE('Justification', this.requestModel.requestDto.frqId).subscribe(
            res => {
              this.logger.debug('Doc order delete successful for docId: ', this.requestModel.requestDto.frqId);
            }, error => {
              this.logger.error('Error occured while deleting DOC ORDER----- ' + error.message);
            });

          this.justificationUploaded = of(false);
          this.pushDocType('Justification');
        }, error => {
          this.logger.error('Error occured while deleting justification----- ' + error.message);
        });



      //this.uploadJustificationText('');

    } else {
      this.deleteDoc(this.justificationId, DocTypeConstants.JUSTIFICATION);
    }
  }

  open(content) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
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

  editJustification() {

    this.showJustification = true;
    this.docDescription = this.justificationText;
    this.pushDocType('Justification');
    this.selectedDocType = 'Justification';
  }

  uploadSuppDocs(formerApplId: number) {
    this.logger.debug('updatind supp appl id: ' + formerApplId)
    this.fsRequestControllerService.updateSuppApplIdUsingPUT(this.requestModel.requestDto.frqId, formerApplId).subscribe(
      result => {

        this.requestModel.requestDto.suppApplId = formerApplId;
        this.baseTaskList.subscribe(items => {
          this.swimlanes[0]['array'].push(result);

          this.insertDocOrder(result);
        });
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

    this.removeDocType("Supplement Application");
    this.showSuppApplications = false;
    this.modalService.dismissAll();
    this.reset();
  }

  downloadSupplementAppDoc(suppApplId: number) {
    this.documentService.downloadSupplementAppDoc(suppApplId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, response.headers.get('filename'));
        }
      );
  }

  validate(): boolean {

    if (this.docDescription !== '') {
      this.isJustificationEntered = true;
    }
    if (this.inputFile.nativeElement.value !== '') {
      this.isFileSelected = true;
    }
    if (this.selectedDocType !== '') {
      this.isTypeSelected = true;
    }
    if (!this.isJustificationEntered && !this.isFileSelected && !this.isTypeSelected) {
      return true;
    }
    return false;
  }

  nextStep(): void {
    if (this.validate()) {
      this.documentsControllerService.loadDocumentsBySortOrderUsingGET(this.requestModel.requestDto.frqId).subscribe(
        result => {
          this.router.navigate(['/request/step4']);
          this.requestModel.requestDto.includedDocs = result;
        }, error => {
          this.logger.error('Error occured while retrieving docs by DOC ORDER----- ' + error.message);
        }
      );


    } else {
      this.showValidations = true;
    }

  }

  prevStep(): void {
    this.requestModel.clearAlerts();
    this.router.navigate(['/request/step2']);
  }

}

export enum DocTypeConstants {
  JUSTIFICATION = 'Justification',
  TRANSITION_MEMO = 'Transition Memo',
  SUMMARY_STATEMENT = 'Summary Statement',

}
