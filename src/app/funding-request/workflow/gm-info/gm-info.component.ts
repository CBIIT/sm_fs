import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { FsLookupControllerService, FsWorkflowControllerService, GmInfoDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { RequestModel } from 'src/app/model/request/request-model';
import { WorkflowModel } from '../workflow.model';

@Component({
  selector: 'app-gm-info',
  templateUrl: './gm-info.component.html',
  styleUrls: ['./gm-info.component.css']
})
export class GmInfoComponent implements OnInit {
  @Input() approvingState = false;
  @ViewChild('gmform', {static: false}) gmform: NgForm;

//  readonly = false;
  options: any = {};
  gmInfo: GmInfoDto;
  gmSpecialistMap: Map<number, any> = new Map<number, any>();
  bkupSpecList: Select2OptionData[];
  defaultSpecList: Select2OptionData[];

  constructor(private workflowService: FsWorkflowControllerService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private lookupService: FsLookupControllerService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
      this.loadData();
  }

  loadData(): void {
      this.gmInfo = {};
      if (this.requestModel.requestDto.actionType) {
        this.gmInfo.actionType = this.requestModel.requestDto.actionType;
        this.gmInfo.defaultSpecFullName = this.requestModel.requestDto.pfrSpecFullName;
        this.gmInfo.bkupSpecNpeId = this.requestModel.requestDto.pfrBkupSpecNpeId;
        this.gmInfo.bkupSpecFullName = this.requestModel.requestDto.pfrBkupSpecFullName;
      }
      else {
        this.workflowService.getDefaultGmInfoUsingGET(this.requestModel.requestDto.frqId).subscribe(
          result => {
            if (result) {
              this.gmInfo = result;
              this.logger.debug('getDefaultGmInfoUsingGET returned', JSON.stringify(result));
            }
            else {
              this.gmInfo = {};
            }
            this.gmInfo.frqId = this.requestModel.requestDto.frqId;
            this.gmInfo.actionType = this.requestModel.requestDto.defaultActionType.toUpperCase();
          },
          error => {
            this.logger.error('getDefaultGmInfoUsingGET failed', error);
          }
        );

        this.lookupService.getGmActiveSpecialistsUsingGET().subscribe(
          result => {
            if (result) {
              this.logger.debug('getGmActiveSpecialistsUsingGET returned', result);
              this.bkupSpecList = result.map( (data) =>
              ({id: String(data.specNpeId), text: data.specCode + ' ' + data.specFullName}));
              this.defaultSpecList = result.map( (data) =>
              ({id: data.specCode + ' ' + data.specFullName, text: data.specCode + ' ' + data.specFullName}));
            }
            this.gmInfo.frqId = this.requestModel.requestDto.frqId;
            this.gmInfo.actionType = this.requestModel.requestDto.defaultActionType;
          },
          error => {
            this.logger.error('getGmActiveSpecialistsUsingGET failed', error);
          }
        );
      }
  }

  getGmInfo(): GmInfoDto {
    if (this.bkupSpecList && !this.gmInfo.bkupSpecFullName) {
      for (const spec of this.bkupSpecList) {
        if (spec.id === String(this.gmInfo.bkupSpecNpeId)) {
          this.gmInfo.bkupSpecFullName = spec.text;
        }
      }
    }
    return this.gmInfo;
  }

  get readonly(): boolean {
    return !(this.workflowModel.isGMApprover && this.approvingState);
  }

  isFormValid(): boolean {
    return this.gmform?.valid;
  }

}
