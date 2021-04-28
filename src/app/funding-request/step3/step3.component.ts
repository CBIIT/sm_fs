import { Component, OnInit, Input , Output , EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import 'select2';
import { Select2OptionData} from 'ng-select2';
import { Options } from 'select2';
import { CgRefCodControllerService, CgRefCodesDto } from '@nci-cbiit/i2ecws-lib';
import { DocumentService } from '../../service/document.service';
import { Observable } from 'rxjs';
import { HttpEventType, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
  styleUrls: ['./step3.component.css']
})
export class Step3Component implements OnInit {

  @Input() apiMethodName: string;
  @Output() selectedDocTypeValue = new EventEmitter<string>();
  public DocTypes:  Array<CgRefCodesDto>;
  public options : Options;

  selectedFiles: FileList;
  progressInfos = [];
  message = '';

  fileInfos: Observable<any>;


  constructor(private router:Router,
    private cgRefCodControllerService:CgRefCodControllerService,
    private documentService: DocumentService) { }

    // For getting the I2 status selected value and emitting the value..
  public _selectedDocType: string = '';

  set selectedDocType(selectedDocType: string) {
    this._selectedDocType = selectedDocType;
    console.log(selectedDocType);
    this.selectedDocTypeValue.emit(this._selectedDocType);
  }

  selectFiles(event) {
    this.progressInfos = [];
    this.selectedFiles = event.target.files;
  }

  uploadFiles() {
    this.message = '';
  
    for (let i = 0; i < this.selectedFiles.length; i++) {
      this.upload(i, this.selectedFiles[i]);
    }
  }

  upload(idx, file) {
    this.progressInfos[idx] = { value: 0, fileName: file.name };
  
    this.documentService.upload(file).subscribe(
      event => {
        // if (event.type === HttpEventType.UploadProgress) {
        //   this.progressInfos[idx].value = Math.round(100 * event.loaded / event.total);
        // } else if (event instanceof HttpResponse) {
        //   this.fileInfos = this.documentService.getFiles();
        // }
      },
      err => {
        this.progressInfos[idx].value = 0;
        this.message = 'Could not upload the file:' + file.name;
      });
  }

  ngOnInit(): void {

    this.cgRefCodControllerService.getPfrDocTypeUsingGET().subscribe(
      result => {
        console.log('Getting the Doc Dropdown results');
        this.DocTypes = result;
      },error => {
        console.log( 'HttpClient get request error for----- '+ error.message);
      });

  }

  nextStep() {
    this.router.navigate(['/request/step4']);
  }

  prevStep() {
    this.router.navigate(['/request/step2']);
  }

}
