import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import 'select2';
import { Select2OptionData } from 'ng-select2';
import { Options } from 'select2';
import { CgRefCodControllerService, CgRefCodesDto, DocumentsDto } from '@nci-cbiit/i2ecws-lib';
import { DocumentService } from '../../service/document.service';
import { Observable } from 'rxjs';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { DragulaService } from 'ng2-dragula';


@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
  styleUrls: ['./step3.component.css']
})
export class Step3Component implements OnInit {


  public items: DocumentsDto[];
  private GREEK_ALPHABET: string[] = ["alpha", "beta", "gamma"];


  @Input() apiMethodName: string;
  @Output() selectedDocTypeValue = new EventEmitter<string>();
  public DocTypes: Array<CgRefCodesDto>;
  public options: Options;

  selectedFiles: FileList;
  progressInfos = [];
  message = '';

  fileInfos: Array<DocumentsDto>;


  constructor(private router: Router,
    private cgRefCodControllerService: CgRefCodControllerService,
    private documentService: DocumentService,
    private dragulaService: DragulaService) {

    dragulaService.dropModel().subscribe((value) => {
      console.log(`dropModel: ${value.item}, ${value.name}, ${value.sourceIndex}, ${value.targetIndex}, ${value.sourceModel}, ${value.targetModel}`);
      value.sourceModel.forEach(element => {
        console.log(element.docFilename);
        //We may have to save this order to the DB.
      });
    });

  }

  


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
        
      },
      err => {
        this.message = 'Could not upload the file:' + file.name;
      });
  }

  ngOnInit(): void {

     this.documentService.getFiles().subscribe(

      result => {
        this.fileInfos = result;
        this.items = result;
      }
    );

    this.cgRefCodControllerService.getPfrDocTypeUsingGET().subscribe(
      result => {
        console.log('Getting the Doc Dropdown results');
        this.DocTypes = result;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

  }

  nextStep() {
    this.router.navigate(['/request/step4']);
  }

  prevStep() {
    this.router.navigate(['/request/step2']);
  }

}
