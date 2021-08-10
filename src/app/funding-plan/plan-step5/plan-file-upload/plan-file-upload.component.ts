import { HttpResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-plan-file-upload',
  templateUrl: './plan-file-upload.component.html',
  styleUrls: ['./plan-file-upload.component.css']
})
export class PlanFileUploadComponent implements OnInit {

  selectedFiles: FileList;
  @ViewChild('inputFile')
  inputFile: ElementRef;
  @ViewChild('labelImport')
  labelImport: ElementRef;

  @Input() 
  templateType = "Other";

  constructor(private planModel: PlanModel,
    private documentService: DocumentService) { }

  ngOnInit(): void {
  }

  selectFiles(event): void {
    const files: FileList = event.target.files;
    this.labelImport.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.selectedFiles = event.target.files;
  }

  downloadTemplate(templateTypes: string) {
    //TODO: Remove the hardcoded content once previous steps are implemented
    console.log("templateType: " +templateTypes);
    this.documentService.downloadTemplate(513, templateTypes)
    
    //this.documentService.downloadTemplate(this.planModel.fundingPlanDto.fprId, templateTypes)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'template.doc');
        }
      );
  }

}
