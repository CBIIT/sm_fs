import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentsControllerService, DocumentsDto } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private docUrl = '/i2ecws/api/v1/documents';

  constructor(private http: HttpClient,
    private documentsControllerService: DocumentsControllerService) { }

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
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  downloadFrqSummaryStatement(applId: number) {
    var url = this.docUrl + '/funding-requests-summary-statement/' + applId;
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' })
  }

  deleteDocById(id: number) {
    return this.documentsControllerService.deleteDocumentUsingPOST(id);
  }

  getLatestFile(keyId: number, keyType: string): Observable<DocumentsDto> {
    return this.documentsControllerService.loadLatestDocumentUsingGET(keyId, keyType);
  }

  downLoadFrqPackage(frqId: number, applId: number, docIds: number[]) {
    var url = this.docUrl + '/funding-requests-view-package/' + frqId + '/' + applId + '/' + docIds;
    return this.http.get<Blob>(`${url}`, { observe: 'response', responseType: 'blob' as 'json' });
  }


}
