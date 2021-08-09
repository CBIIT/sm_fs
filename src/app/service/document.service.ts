import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentsControllerService, DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private docUrl = '/i2ecws/api/v1/documents';
  private docViewerUrl = '/i2ecws/api/v1/doc-viewer';

  constructor(private http: HttpClient,
    private documentsControllerService: DocumentsControllerService, private logger: NGXLogger) { }

  upload(file: File, docDto: DocumentsDto): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();

    formData.append('file', file);
    formData.append('keyId', docDto.keyId.toString());
    formData.append('keyType', docDto.keyType);
    formData.append('docType', docDto.docType);
    formData.append('docDescription', docDto.docDescription);

    const req = new HttpRequest('POST', `${this.docUrl}/add`, formData, {
      reportProgress: true,
      responseType: 'json'
    });
    return this.http.request(req);

  }

  getFiles(keyId: number, keyType: string): Observable<DocumentsDto[]> {
    return this.documentsControllerService.loadDocumentsUsingGET(keyId, keyType);
  }

  downloadById(uuid: number) {
    var url = this.docUrl + '/' + uuid;
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  downloadFrqCoverSheet(frqId: number) {
    var url = this.docUrl + '/funding-requests-cover-page/' + frqId;
    this.logger.debug('Step3 FRQ Cover Sheet URL:', url);
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  downloadFrqSummaryStatement(applId: number) {
    var url = this.docUrl + '/funding-requests-summary-statement/' + applId;
    this.logger.debug('Step3 Summary Statement URL:', url);
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  deleteDocById(id: number) {
    return this.documentsControllerService.deleteDocumentUsingPOST(id);
  }

  getLatestFile(keyId: number, keyType: string): Observable<DocumentsDto> {
    this.logger.debug('Step3 latest files for (keyId, KeyType): ', '(' + keyId + ',' + keyType + ')');
    return this.documentsControllerService.loadLatestDocumentUsingGET(keyId, keyType);
  }

  downLoadFrqPackage(frqId: number, applId: number) {
    var url = this.docUrl + '/funding-requests-view-package/' + frqId + '/' + applId;
    this.logger.debug('Step3 FRQ Package URL: ', url);
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' });
  }

  getFSBudgetFiles(keyId: number, keyType: string): Observable<Array<DocumentsDto>> {
    this.logger.debug('Step3 budget files for (keyId, KeyType): ', '(' + keyId + ',' + keyType + ')');
    return this.documentsControllerService.loadFsFinanceDocumentsUsingGET(keyId, keyType);
  }

  downloadSupplementAppDoc(suppApplId: number) {
    var url = this.docViewerUrl + '/supplement-app/' + suppApplId;
    this.logger.debug('Step3 FRQ supplement applications URL:', url);
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  downloadFPCoverSheet(fpId: number) {
    var url = this.docUrl + '/funding-plans-cover-page/' + fpId;
    this.logger.debug('Funding Plan Cover Sheet URL:', url);
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  downloadTemplate(fprId: number,  templateType: string) {
    var url = this.docUrl + '/funding-plans-word-template/' + fprId + '/' + templateType;
    this.logger.debug('Funding Plan Cover Sheet URL:', url);
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }


}
