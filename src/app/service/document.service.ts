import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentsControllerService, DocumentsDto } from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private docUrl = 'i2ecws/api/v1/documents';

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

  downloadById(id: number): Observable<Blob> {
    var url = this.docUrl + '/' + id;
		return this.http.get(`${url}`, {responseType: 'blob'});
  }

  downloadFrqCoverSheet(frqId: number): Observable<Blob> {
    var url = this.docUrl + '/funding-requests-cover-page/' + frqId;
		return this.http.get(`${url}`, {responseType: 'blob'});
  }

  deleteDocById(id: number) {
    return this.documentsControllerService.deleteDocumentUsingGET(id);
  }

 
}
