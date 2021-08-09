import { HttpResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { DocumentService } from 'src/app/service/document.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-plan-step5',
  templateUrl: './plan-step5.component.html',
  styleUrls: ['./plan-step5.component.css']
})
export class PlanStep5Component implements OnInit {

  selectedFiles: FileList;
  @ViewChild('inputFile')
  inputFile: ElementRef;
  @ViewChild('labelImport')
  labelImport: ElementRef;

  constructor(private navigationModel: NavigationStepModel,
    private planModel: PlanModel,
    private documentService: DocumentService) { }

  ngOnInit(): void {
    this.navigationModel.setStepLinkable(5, true);
  }

  selectFiles(event): void {
    const files: FileList = event.target.files;
    this.labelImport.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.selectedFiles = event.target.files;
  }

   downloadTemplate(templateType: string) {
    //TODO: Remove the hardcoded content once previous steps are implemented
    this.documentService.downloadTemplate(513, templateType)
    
    //this.documentService.downloadTemplate(this.planModel.fundingPlanDto.fprId, templateType)
      .subscribe(
        (response: HttpResponse<Blob>) => {
          let blob = new Blob([response.body], { 'type': response.headers.get('content-type') });
          saveAs(blob, 'template.doc');
        }
      );
  }

}
