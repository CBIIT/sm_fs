import { HttpResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { RequestModel } from 'src/app/model/request/request-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';
import { NGXLogger } from 'ngx-logger';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Step4Component } from '../step4/step4.component';
import { DocumentsDto } from '@cbiit/i2ecws-lib';
import { DocTypeConstants } from '../step3/step3.component';

@Component({
  selector: 'app-supporting-docs-readonly',
  templateUrl: './supporting-docs-readonly.component.html',
  styleUrls: ['./supporting-docs-readonly.component.css']
})
export class SupportingDocsReadonlyComponent implements OnInit {

  closeResult: string;
  private _parent: Step4Component;
  @Input() set parent(value: Step4Component) {
    this._parent = value;
  }

  get parent(): Step4Component {
    return this._parent;
  }

  justificationMissing = false;
  transitionMemoMissing = false;
  justificationType = '';
  justificationText = '';
  docDtos: DocumentsDto[];
  displayTansitionMemo: boolean = false;
  isSummaryIncluded = false;
  isDisplayJustificationDetails = true;

  constructor(private documentService: DocumentService,
    private logger: NGXLogger,
    private modalService: NgbModal,
    private requestModel: RequestModel,) { }

  ngOnInit(): void {
    this.justificationMissing = this.parent.justificationMissing;
    this.transitionMemoMissing = this.parent.transitionMemoMissing;
    this.justificationType = this.parent.justificationType;
    this.justificationText = this.parent.justificationText;
    this.docDtos = this.parent.docDtos;


    this.docDtos.forEach((value, index) => {

      if (value.docFilename === DocTypeConstants.JUSTIFICATION && value.uploadByName === null) {
        this.isDisplayJustificationDetails = false;
      }

    });

    if (this.requestModel.requestDto.requestType === 'Pay Type 4' ||
      (this.requestModel.requestDto.conversionActivityCode && this.requestModel.requestDto.conversionActivityCode !== null)) {
      this.displayTansitionMemo = true;
    }

  }

  downloadPackage() {
    this.documentService.downLoadFrqPackage(this.requestModel.requestDto.frqId,
      this.requestModel.grant.applId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Package.pdf');
        }
      ), error =>
        this.logger.error('Error downloading the file'),
      () => console.info('File downloaded successfully');
  }

  downloadCoverSheet(): void {
    this.documentService.downloadFrqCoverSheet(this.requestModel.requestDto.frqId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          const blob = new Blob([response.body], { type: response.headers.get('content-type') });
          saveAs(blob, 'Cover Page.pdf');
        }
      );
  }

  downloadFile(id: number, fileName: string): void {

    if (fileName === 'Summary Statement') {
      this.downloadSummaryStatement();
    }else if (fileName === 'Supplement Application') {
      this.downloadSupplementAppDoc(this.requestModel.requestDto.suppApplId);
    } else {
      this.documentService.downloadById(id)
        .subscribe(
          (response: HttpResponse<Blob>) => {
            const blob = new Blob([response.body], { type: response.headers.get('content-type') });
            saveAs(blob, fileName);
          }
        );
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

  downloadSummaryStatement(): void {
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

  downloadSupplementAppDoc(suppApplId: number) {
    this.documentService.downloadSupplementAppDoc(suppApplId)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, response.headers.get('filename'));
        }
      );
  }


}
