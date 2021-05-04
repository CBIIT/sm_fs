import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private docUrl = 'i2ecws/api/v1/documents';

  constructor(private http: HttpClient) { }

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




  reader.readAsBinaryString(file);

  reader.onloadend = (e) => {
    //console.log(myReader.result);
    // Entire file
    console.log(reader.result);

    // By lines


    this.fileString = reader.result as string;
 };


    // return this.documentsControllerService.addDocumentUsingPOST(this.fileString, 1, "abc", "test").pipe(
    //
    //   map(
    //     result => {
    //       this.response = result;
    //       return result;
    //     })
    //
    //
    //
    //   );
    return null;
    }

||||||| 4e1db75



  reader.readAsBinaryString(file);

  reader.onloadend = (e) => {
    //console.log(myReader.result);
    // Entire file
    console.log(reader.result);

    // By lines


    this.fileString = reader.result as string;
 };


    return this.documentsControllerService.addDocumentUsingPOST(this.fileString, 1, "abc", "test").pipe(

      map(
        result => {
          this.response = result;
          return result;
        })



      );
    }

  getFiles(): Observable<any> {
    return this.http.get(`${this.docUrl}/files`);
  }
}
