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

  upload(file: File): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();

    formData.append('file', file);
    formData.append('keyId', '1');
    formData.append('keyType', 'PFR');
    formData.append('docType', 'Doc Type');

    const req = new HttpRequest('POST', `${this.docUrl}/add`, formData, {
      reportProgress: true,
      responseType: 'json'
    });
    return this.http.request(req);

  }

  getFiles(): Observable<DocumentsDto[]> {
    return this.documentsControllerService.loadDocumentsUsingGET(1, 'PFR');
  }
  
}
