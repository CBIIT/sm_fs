import { Component, Input, OnInit } from '@angular/core';
import { FsLookupControllerService, FsWorkflowControllerService, GmInfoDto } from '@nci-cbiit/i2ecws-lib';
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

  options: any = {};
  gmInfo: GmInfoDto = {};
  gmSpecialistMap: Map<number, any> = new Map<number, any>();
  bkupSpecList: {id: string, text: string}[];
  defaultSpecList: string[];

  constructor(private workflowService: FsWorkflowControllerService,
              private requestModel: RequestModel,
              private workflowModel: WorkflowModel,
              private lookupService: FsLookupControllerService,
              private logger: NGXLogger) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
      this.workflowService.getDefaultGmInfoUsingGET(this.requestModel.requestDto.frqId).subscribe(
      result => {
        if (result) {
          this.gmInfo = result;
          this.logger.debug('getDefaultGmInfoUsingGET returned', result);
        }
        else {
          this.gmInfo = {};
        }
        this.gmInfo.frqId = this.requestModel.requestDto.frqId;
        this.gmInfo.actionType = this.requestModel.requestDto.defaultActionType;
      },
      error => {
        this.logger.error('getDefaultGmInfoUsingGET failed', error);
      }
    );
      this.lookupService.getGmActiveSpecialistsUsingGET().subscribe(
      result => {
        if (result) {
          this.logger.debug('getGmActiveSpecialistsUsingGET returned', result);
          this.bkupSpecList = result.map( (data) => ({id: data.specNpeId, text: data.specFullName}));
          this.defaultSpecList = result.map( (data) => (data.specFullName));
        }
        this.gmInfo.frqId = this.requestModel.requestDto.frqId;
        this.gmInfo.actionType = this.requestModel.requestDto.defaultActionType;
      },
      error => {
        this.logger.error('getGmActiveSpecialistsUsingGET failed', error);
      }
    );
  }

  getGmInfo(): GmInfoDto {
    return this.gmInfo;
  }

  get editable(): boolean {
    return this.workflowModel.isScientificApprover && this.approvingState;
  }

}
