import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentsControllerService } from '@nci-cbiit/i2ecws-lib';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private baseUrl = 'http://localhost:8080';
  private response: String;
  fileString:string = "";
 // fileString: string;


  constructor(private http: HttpClient,
    private documentsControllerService: DocumentsControllerService) { }

  upload(file: File): Observable<string> {
    const formData: FormData = new FormData();

    formData.append('file', file);

    // const req = new HttpRequest('POST', `${this.baseUrl}/upload`, formData, {
    //   reportProgress: true,
    //   responseType: 'json'
    // });


    var reader = new FileReader();

  reader.onload = function () {
    console.log(reader.result);
  }




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
    return this.http.get(`${this.baseUrl}/files`);
  }
}
