import { HttpResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { RequestModel } from 'src/app/model/request/request-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';
import { NGXLogger } from 'ngx-logger';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ReviewRequestComponent } from '../review-request/review-request.component';
import { DocumentsDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-supporting-docs-readonly',
  templateUrl: './supporting-docs-readonly.component.html',
  styleUrls: ['./supporting-docs-readonly.component.css']
})
export class SupportingDocsReadonlyComponent implements OnInit {

  closeResult: string;
  private _parent: ReviewRequestComponent;
  @Input() set parent(value: ReviewRequestComponent) {
    this._parent = value;
  }

  get parent(): ReviewRequestComponent {
    return this._parent;
  }

  justificationMissing = false;
  justificationType = '';
  justificationText = '';
  docDtos: DocumentsDto[];

  constructor(private documentService: DocumentService,
    private logger: NGXLogger,
    private modalService: NgbModal,
    private requestModel: RequestModel,) { }

  ngOnInit(): void {
    this.justificationMissing = this.parent.justificationMissing;
    this.justificationType = this.parent.justificationType;
    this.justificationText = this.parent.justificationText;
    this.docDtos = this.parent.docDtos;

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
        blob => saveAs(blob, 'Summary Statement.pdf'),
        _error => this.logger.error('Error downloading the file'),
        () => this.logger.debug('File downloaded successfully')
      );
  }

}
